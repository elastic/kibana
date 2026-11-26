/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';

// This prefix is used to identify hash strings that have been encoded in the URL.
const HASH_PREFIX = 'h@';

export function isStateHash(str: string) {
  return String(str).indexOf(HASH_PREFIX) === 0;
}

export function createStateHash(
  json: string,
  existingJsonProvider?: (hash: string) => string | null
) {
  if (typeof json !== 'string') {
    throw new Error('createHash only accepts strings (JSON).');
  }

  const hash = new Sha256().update(json, 'utf8').digest('hex');

  let shortenedHash;

  // Shorten the hash to at minimum 7 characters. We just need to make sure that it either:
  // a) hasn't been used yet
  // b) or has been used already, but with the JSON we're currently hashing.
  for (let i = 7; i < hash.length; i++) {
    shortenedHash = hash.slice(0, i);
    const existingJson = existingJsonProvider ? existingJsonProvider(shortenedHash) : null;
    if (existingJson === null || existingJson === json) break;
  }

  return `${HASH_PREFIX}${shortenedHash}`;
}
