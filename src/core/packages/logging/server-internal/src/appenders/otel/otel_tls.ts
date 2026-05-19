/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import type { AgentOptions as HttpsAgentOptions } from 'https';
import type { PeerCertificate } from 'tls';
import type { OtelAppenderTlsConfig } from '@kbn/core-logging-server';

/** Compatible with `@grpc/grpc-js` `VerifyOptions` passed to `credentials.createSsl`. */
export interface OtelGrpcVerifyOptions {
  rejectUnauthorized?: boolean;
  checkServerIdentity?: (hostname: string, cert: PeerCertificate) => Error | undefined;
}

const PEM_MARKER = '-----BEGIN';

/** Inline PEM blocks contain this marker; anything else is treated as a filesystem path. */
const readPemOrPath = (value: string, label: string): Buffer => {
  const trimmed = value.trim();
  if (trimmed.includes(PEM_MARKER)) {
    return Buffer.from(trimmed, 'utf8');
  }
  try {
    return readFileSync(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to load ${label} from "${trimmed}": ${message}`);
  }
};

const concatCaBuffers = (buffers: Buffer[]): Buffer =>
  Buffer.concat(buffers.flatMap((b, i) => (i === 0 ? [b] : [Buffer.from('\n'), b])));

export interface ResolvedOtelTls {
  /** PEM-encoded CA bundle(s) for verifying the remote endpoint (may be multiple concat sources). */
  ca?: Buffer | Buffer[];
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
  verificationMode: 'full' | 'certificate' | 'none';
}

/**
 * Reads certificate material from disk or accepts inline PEM strings.
 * Returns `undefined` when there is nothing to apply (no `ssl` block or empty block).
 */
export const resolveTlsMaterial = (config?: OtelAppenderTlsConfig): ResolvedOtelTls | undefined => {
  if (!config) {
    return undefined;
  }

  let ca: Buffer | Buffer[] | undefined;
  if (config.certificateAuthorities != null) {
    const entries = Array.isArray(config.certificateAuthorities)
      ? config.certificateAuthorities
      : [config.certificateAuthorities];
    const resolved = entries.map((entry, i) =>
      readPemOrPath(entry, `ssl.certificateAuthorities[${i}]`)
    );
    ca = resolved.length === 1 ? resolved[0] : resolved;
  }

  let cert: Buffer | undefined;
  let key: Buffer | undefined;
  if (config.certificate) {
    cert = readPemOrPath(config.certificate, 'ssl.certificate');
  }
  if (config.key) {
    key = readPemOrPath(config.key, 'ssl.key');
  }

  return {
    ca,
    cert,
    key,
    passphrase: config.keyPassphrase,
    verificationMode: config.verificationMode,
  };
};

export const buildHttpsAgentTlsOptions = (resolved: ResolvedOtelTls): HttpsAgentOptions => {
  const opts: HttpsAgentOptions = {};

  if (resolved.ca !== undefined) {
    opts.ca = resolved.ca;
  }
  if (resolved.cert) {
    opts.cert = resolved.cert;
  }
  if (resolved.key) {
    opts.key = resolved.key;
  }
  if (resolved.passphrase) {
    opts.passphrase = resolved.passphrase;
  }

  switch (resolved.verificationMode) {
    case 'none':
      opts.rejectUnauthorized = false;
      break;
    case 'certificate':
      opts.rejectUnauthorized = true;
      opts.checkServerIdentity = () => undefined;
      break;
    case 'full':
      opts.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl.verificationMode: ${resolved.verificationMode}`);
  }

  return opts;
};

export const toGrpcRootCerts = (resolved: ResolvedOtelTls): Buffer | null => {
  if (resolved.ca === undefined) {
    return null;
  }
  return Array.isArray(resolved.ca) ? concatCaBuffers(resolved.ca) : resolved.ca;
};

export const buildGrpcVerifyOptions = (resolved: ResolvedOtelTls): OtelGrpcVerifyOptions => {
  switch (resolved.verificationMode) {
    case 'none':
      return { rejectUnauthorized: false };
    case 'certificate':
      return {
        rejectUnauthorized: true,
        checkServerIdentity: () => undefined,
      };
    case 'full':
      return { rejectUnauthorized: true };
    default:
      throw new Error(`Unknown ssl.verificationMode: ${resolved.verificationMode}`);
  }
};
