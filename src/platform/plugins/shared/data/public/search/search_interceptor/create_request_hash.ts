/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';
import stringify from 'json-stable-stringify';

/**
 * Generate the hash for this request. Ignores the `preference` parameter since it generally won't
 * match from one request to another identical request.
 */
export function createRequestHash(keys: Record<string, any>) {
  const { preference, ...params } = keys;
  return new Sha256().update(stringify(params), 'utf8').digest('hex');
}
