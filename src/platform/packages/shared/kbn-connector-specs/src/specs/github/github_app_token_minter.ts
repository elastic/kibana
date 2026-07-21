/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';

const GITHUB_API = 'https://api.github.com';
const APP_JWT_LIFETIME_SECONDS = 9 * 60;

export interface GithubAppConfig {
  appId: string;
  privateKeyPem: string;
}

export interface MintOptions {
  repositories?: string[];
  permissions?: Record<string, string>;
}

export interface MintedInstallationToken {
  token: string;
  expiresAt: string;
  permissions: Record<string, string>;
  repositorySelection?: string;
}

const base64urlEncodeBuffer = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64urlEncodeString = (str: string): string =>
  btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const normalizePrivateKeyPem = (privateKeyPem: string): string => {
  const normalized = privateKeyPem
    .trim()
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  const match = normalized.match(
    /-----BEGIN ([A-Z ]+PRIVATE KEY)-----\s*([\s\S]*?)\s*-----END \1-----/
  );
  if (!match) {
    return normalized;
  }

  const [, label, body] = match;
  const compactBody = body.replace(/\s+/g, '');
  const wrappedBody = compactBody.match(/.{1,64}/g)?.join('\n') ?? compactBody;
  return `-----BEGIN ${label}-----\n${wrappedBody}\n-----END ${label}-----`;
};

const pemToDer = (pem: string): { label: string; der: Uint8Array } => {
  const normalized = normalizePrivateKeyPem(pem);
  const match = normalized.match(
    /-----BEGIN ([A-Z ]+PRIVATE KEY)-----\s*([\s\S]*?)\s*-----END \1-----/
  );
  if (!match) {
    throw new Error('private key must include BEGIN/END PEM lines');
  }
  const [, label, body] = match;
  const binary = atob(body.replace(/\s+/g, ''));
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    der[i] = binary.charCodeAt(i);
  }
  return { label, der };
};

const derLength = (length: number): number[] => {
  if (length < 128) {
    return [length];
  }
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining % 256);
    remaining = Math.floor(remaining / 256);
  }
  return [128 + bytes.length, ...bytes];
};

const derSequence = (...parts: Uint8Array[]): Uint8Array => {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  return Uint8Array.from([0x30, ...derLength(length), ...parts.flatMap((part) => [...part])]);
};

const derOctetString = (value: Uint8Array): Uint8Array =>
  Uint8Array.from([0x04, ...derLength(value.length), ...value]);

const pkcs1ToPkcs8 = (pkcs1Der: Uint8Array): Uint8Array => {
  const version = Uint8Array.from([0x02, 0x01, 0x00]);
  const rsaEncryptionAlgorithm = Uint8Array.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  return derSequence(version, rsaEncryptionAlgorithm, derOctetString(pkcs1Der));
};

const toArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
};

const privateKeyPemToPkcs8Der = (privateKeyPem: string): ArrayBuffer => {
  const { label, der } = pemToDer(privateKeyPem);
  if (label === 'PRIVATE KEY') {
    return toArrayBuffer(der);
  }
  if (label === 'RSA PRIVATE KEY') {
    return toArrayBuffer(pkcs1ToPkcs8(der));
  }
  throw new Error(`unsupported private key type "${label}"`);
};

const signAppJwt = async (appId: string, privateKeyPem: string): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + APP_JWT_LIFETIME_SECONDS, iss: appId };
  const signingInput = `${base64urlEncodeString(JSON.stringify(header))}.${base64urlEncodeString(
    JSON.stringify(payload)
  )}`;

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyPemToPkcs8Der(privateKeyPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    return `${signingInput}.${base64urlEncodeBuffer(signature)}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `GitHub App private key is not a valid unencrypted PEM private key (${message}). ` +
        'Download a new private key from the GitHub App settings and paste the full PEM, including BEGIN/END lines.'
    );
  }
};

const ghFetch = async (
  path: string,
  { method = 'GET', token, body }: { method?: string; token: string; body?: unknown } = {
    token: '',
  }
): Promise<unknown> => {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${method} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
};

const isUnknownAppError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('/app/installations failed (404)') && message.includes('Integration not found')
  );
};

const unknownAppMessage = (appId: string): string =>
  `GitHub App ${appId} was not found by GitHub. Check that the connector App ID is the numeric App ID from GitHub App settings, and that the private key was generated for that same app. Do not use the installation ID, client ID, or client secret.`;

export class GithubAppTokenMinter {
  constructor(private readonly config: GithubAppConfig, private readonly logger?: Logger) {}

  async findInstallationId(accountLogin: string): Promise<number> {
    const jwt = await signAppJwt(this.config.appId, this.config.privateKeyPem);
    let installations: Array<{ id: number; account?: { login?: string } }>;
    try {
      installations = (await ghFetch('/app/installations', { token: jwt })) as Array<{
        id: number;
        account?: { login?: string };
      }>;
    } catch (error) {
      if (isUnknownAppError(error)) {
        throw new Error(unknownAppMessage(this.config.appId));
      }
      throw error;
    }
    const match = installations.find(
      (i) => i.account?.login?.toLowerCase() === accountLogin.toLowerCase()
    );
    if (!match) {
      throw new Error(
        `GitHub App ${this.config.appId} has no installation on "${accountLogin}" ` +
          `(found: ${installations.map((i) => i.account?.login).join(', ') || 'none'})`
      );
    }
    return match.id;
  }

  async mintInstallationToken(
    installationId: number,
    opts: MintOptions = {}
  ): Promise<MintedInstallationToken> {
    const jwt = await signAppJwt(this.config.appId, this.config.privateKeyPem);
    const body: Record<string, unknown> = {};
    if (opts.repositories?.length) body.repositories = opts.repositories;
    if (opts.permissions) body.permissions = opts.permissions;

    const result = (await ghFetch(`/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      token: jwt,
      body: Object.keys(body).length ? body : undefined,
    })) as {
      token: string;
      expires_at: string;
      permissions: Record<string, string>;
      repository_selection?: string;
    };

    this.logger?.info(
      `Minted GitHub App installation token (install ${installationId}, expires ${result.expires_at}, ` +
        `perms ${JSON.stringify(result.permissions)})`
    );
    return {
      token: result.token,
      expiresAt: result.expires_at,
      permissions: result.permissions,
      repositorySelection: result.repository_selection,
    };
  }

  async mintForAccount(
    accountLogin: string,
    opts: MintOptions = {}
  ): Promise<MintedInstallationToken> {
    const installationId = await this.findInstallationId(accountLogin);
    return this.mintInstallationToken(installationId, opts);
  }
}
