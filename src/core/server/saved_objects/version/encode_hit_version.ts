/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { encodeVersion } from './encode_version';

/**
 * Helper for encoding a version from a "hit" (hits.hits[#] from _search) or
 * "doc" (body from GET, update, etc) object
 */
export function encodeHitVersion(response: { _seq_no: number; _primary_term: number }) {
  return encodeVersion(response._seq_no, response._primary_term);
}
