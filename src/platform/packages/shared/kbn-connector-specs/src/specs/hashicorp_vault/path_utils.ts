/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Safe URL/path construction for the HashiCorp Vault connector (and, for
 * `mountPath`, the `vault_approle` auth type). Vault paths and mount points are
 * concatenated directly into request URLs, so they must be validated and
 * percent-encoded segment-by-segment before being joined -- accepting them as
 * opaque strings would allow path traversal (`../`), scheme confusion, or
 * request-splitting via unencoded `/`, `?`, `#` characters.
 *
 * Every error thrown here names only the field and the nature of the problem;
 * none of them interpolate the field's value into the message, so these
 * functions are safe to call with values that must never be logged unredacted.
 */

/**
 * Validates a Vault server address. Only accepts an absolute `https://` origin
 * with no path, query, fragment, or embedded userinfo -- i.e. exactly the shape
 * `https://host[:port]`. Returns the normalized origin (no trailing slash).
 */
export function validateVaultAddress(address: string, fieldLabel = 'address'): string {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new Error(`Vault ${fieldLabel} must be a valid absolute URL.`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`Vault ${fieldLabel} must use the https scheme.`);
  }
  if (url.username || url.password) {
    throw new Error(`Vault ${fieldLabel} must not contain embedded credentials.`);
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error(
      `Vault ${fieldLabel} must not include a path; provide only the scheme, host, and optional port.`
    );
  }
  if (url.search || url.hash) {
    throw new Error(`Vault ${fieldLabel} must not include a query string or fragment.`);
  }

  return url.origin;
}

const isSafeSegment = (segment: string): boolean =>
  segment.length > 0 && segment !== '.' && segment !== '..';

/**
 * Validates and percent-encodes each `/`-delimited segment of a Vault path (or
 * mount point). Rejects leading/trailing slashes, empty segments (e.g. `//`),
 * and `.`/`..` segments. Returns the segments re-joined with `/`, with each
 * segment individually percent-encoded via `encodeURIComponent` (so a segment
 * that itself legitimately contains a literal `/` cannot be used to smuggle
 * extra path structure).
 */
export function encodeVaultPathSegments(path: string, fieldLabel = 'path'): string {
  if (path.length === 0) {
    throw new Error(`Vault ${fieldLabel} must not be empty.`);
  }
  if (path.startsWith('/') || path.endsWith('/')) {
    throw new Error(`Vault ${fieldLabel} must not have a leading or trailing slash.`);
  }

  const segments = path.split('/');
  if (!segments.every(isSafeSegment)) {
    throw new Error(
      `Vault ${fieldLabel} must not contain empty, '.', or '..' segments (e.g. '//' or '../').`
    );
  }

  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

/**
 * Builds a full Vault API URL from a validated origin, a fixed API-side prefix
 * (e.g. `v1`), and a caller-supplied path, applying `encodeVaultPathSegments` to
 * the caller-supplied portion only.
 */
export function buildVaultUrl(origin: string, prefixSegments: string[], path: string): string {
  const encodedPrefix = prefixSegments.map((segment) => encodeURIComponent(segment)).join('/');
  const encodedPath = encodeVaultPathSegments(path);
  return `${origin}/${encodedPrefix}/${encodedPath}`;
}
