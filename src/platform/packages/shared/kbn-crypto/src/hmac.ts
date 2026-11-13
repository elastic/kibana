/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'crypto';

const HEX = /^[0-9a-fA-F]+$/;

/** HMAC-SHA256 hex digest of `bindingParts` joined by `|`, keyed by `token`. */
export const computeTokenHmac = (token: string, ...bindingParts: [string, ...string[]]): string =>
  crypto.createHmac('sha256', token).update(bindingParts.join('|')).digest('hex');

/** Compares two even-length hex digests in constant time. */
export const timingSafeEqualHex = (leftHex: string, rightHex: string): boolean => {
  if (
    leftHex.length === 0 ||
    leftHex.length !== rightHex.length ||
    leftHex.length % 2 !== 0 ||
    !HEX.test(leftHex) ||
    !HEX.test(rightHex)
  ) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(leftHex, 'hex'), Buffer.from(rightHex, 'hex'));
};
