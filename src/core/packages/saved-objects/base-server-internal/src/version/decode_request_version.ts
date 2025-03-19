/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { decodeVersion } from './decode_version';

/**
 * Helper for decoding version to request params that are driven
 * by the version info
 */
export function decodeRequestVersion(version?: string) {
  const decoded = decodeVersion(version);
  return {
    if_seq_no: decoded._seq_no,
    if_primary_term: decoded._primary_term,
  };
}
