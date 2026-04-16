/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodeBase64 } from './base64';

/**
 * Encode the sequence params into an "opaque" version string
 * that can be used in the saved object API in place of numeric
 * version numbers
 */
export function encodeVersion(seqNo?: number, primaryTerm?: number) {
  if (!Number.isInteger(primaryTerm)) {
    throw new TypeError('_primary_term from elasticsearch must be an integer');
  }

  if (!Number.isInteger(seqNo)) {
    throw new TypeError('_seq_no from elasticsearch must be an integer');
  }

  return encodeBase64(JSON.stringify([seqNo, primaryTerm]));
}
