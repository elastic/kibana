/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const GCP_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWT_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const TOKEN_LIFETIME_SECONDS = 3600;

export interface GcpServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export interface GcpAccessToken {
  accessToken: string;
  expiresAt: number;
}

function base64urlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlEncodeString(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Sign a JWT payload using RS256 (RSASSA-PKCS1-v1_5 with SHA-256).
 * Uses the Web Crypto API for portability.
 */
async function signJwt(
  privateKeyPem: string,
  jwtPayload: Record<string, unknown>
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };

  const encodedHeader = base64urlEncodeString(JSON.stringify(header));
  const encodedPayload = base64urlEncodeString(JSON.stringify(jwtPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const textEncoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    textEncoder.encode(signingInput)
  );

  const encodedSignature = base64urlEncodeBuffer(signature);
  return `${signingInput}.${encodedSignature}`;
}

function buildJwtClaims(
  clientEmail: string,
  opts: { scope?: string; targetAudience?: string }
): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: clientEmail,
    sub: clientEmail,
    aud: GCP_TOKEN_URL,
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
  };

  if (opts.targetAudience) {
    claims.target_audience = opts.targetAudience;
  } else if (opts.scope) {
    claims.scope = opts.scope;
  }

  return claims;
}

export function parseServiceAccountKey(json: string): GcpServiceAccountKey {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid service account JSON: failed to parse');
  }

  if (parsed.type !== 'service_account') {
    throw new Error(
      `Invalid service account JSON: expected type "service_account", got "${parsed.type}"`
    );
  }

  if (!parsed.client_email || typeof parsed.client_email !== 'string') {
    throw new Error('Invalid service account JSON: missing client_email');
  }

  if (!parsed.private_key || typeof parsed.private_key !== 'string') {
    throw new Error('Invalid service account JSON: missing private_key');
  }

  return parsed as unknown as GcpServiceAccountKey;
}

async function exchangeJwtForToken(jwt: string): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    grant_type: JWT_GRANT_TYPE,
    assertion: jwt,
  });

  const response = await fetch(GCP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to exchange JWT for token (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Exchange a service account's private key for a short-lived GCP access token.
 *
 * Flow:
 * 1. Create a self-signed JWT (RS256) with the service account's private key and an OAuth scope
 * 2. POST the JWT assertion to Google's token endpoint
 * 3. Receive an OAuth2 access token (valid for 1 hour)
 *
 * Use for: Admin API calls (Cloud Run, Cloud Functions, etc.)
 */
export async function getGcpAccessToken(
  clientEmail: string,
  privateKey: string,
  scope: string
): Promise<GcpAccessToken> {
  const claims = buildJwtClaims(clientEmail, { scope });
  const jwt = await signJwt(privateKey, claims);
  const data = await exchangeJwtForToken(jwt);

  const accessToken = data.access_token;
  if (typeof accessToken !== 'string') {
    throw new Error('Token exchange did not return an access_token');
  }

  const expiresIn = data.expires_in;
  if (typeof expiresIn !== 'number') {
    throw new Error('Token exchange did not return expires_in');
  }

  return {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

/**
 * Exchange a service account's private key for a GCP identity token (OIDC ID token).
 *
 * Flow:
 * 1. Create a self-signed JWT (RS256) with target_audience set to the service URL
 * 2. POST the JWT assertion to Google's token endpoint
 * 3. Receive an OIDC ID token (valid for 1 hour)
 *
 * Use for: Invoking authenticated Cloud Run services / Cloud Functions.
 * Cloud Run requires ID tokens (not access tokens) for service-to-service auth.
 */
export async function getGcpIdToken(
  clientEmail: string,
  privateKey: string,
  targetAudience: string
): Promise<string> {
  const claims = buildJwtClaims(clientEmail, { targetAudience });
  const jwt = await signJwt(privateKey, claims);
  const data = await exchangeJwtForToken(jwt);

  const idToken = data.id_token as string | undefined;
  if (!idToken) {
    throw new Error('Token exchange did not return an id_token');
  }

  return idToken;
}
