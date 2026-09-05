/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Decodes an `Authorization: Basic <base64>` header into username/password.
 * Splits on the first colon only so passwords containing colons are handled correctly.
 *
 * Native (non-HTTP) client types receive credentials via `CredentialAccessor.getAuthHeaders()`
 * — the same accessor HTTP-based connectors use — and must recover the raw username/password
 * from the header to hand to their driver's binary protocol.
 */
export const parseBasicAuthHeader = (
  header: string
): { username: string; password: string } | null => {
  const match = /^Basic (.+)$/i.exec(header);
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return null;
  return { username: decoded.slice(0, colonIdx), password: decoded.slice(colonIdx + 1) };
};
