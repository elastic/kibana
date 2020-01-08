/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Sha256 } from '../../../../../core/public/utils';
import { hashedItemStore } from '../../storage/hashed_item_store';

// This prefix is used to identify hash strings that have been encoded in the URL.
const HASH_PREFIX = 'h@';

export function createStateHash(
  json: string,
  existingJsonProvider?: (hash: string) => string | null // TODO: temp while state.js relies on this in tests
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
    const existingJson = existingJsonProvider
      ? existingJsonProvider(shortenedHash)
      : hashedItemStore.getItem(shortenedHash);
    if (existingJson === null || existingJson === json) break;
  }

  return `${HASH_PREFIX}${shortenedHash}`;
}

export function isStateHash(str: string) {
  return String(str).indexOf(HASH_PREFIX) === 0;
}
