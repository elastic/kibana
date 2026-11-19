/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** OpenSSH public-key lines and bare blobs both fit under this, including a comment. */
export const HOST_KEY_MAX_LENGTH = 4096;

const BASE64_KEY =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

/**
 * Returns the base64 key blob from an OpenSSH public key line or a bare blob.
 * The blob is what the SSH server presents during key exchange.
 */
export const parsePinnedHostKey = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.replace(/\r/g, '').trim();
  if (!trimmed || trimmed.length > HOST_KEY_MAX_LENGTH) {
    return undefined;
  }
  const parts = trimmed.split(/\s+/);
  const blob = parts.length === 1 ? parts[0] : parts[1];
  if (!blob || blob.length < 16 || !BASE64_KEY.test(blob)) {
    return undefined;
  }
  return blob;
};
