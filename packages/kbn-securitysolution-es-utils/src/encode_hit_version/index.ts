/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Very similar to the encode_hit_version from saved object system from here:
 * src/core/server/saved_objects/version/encode_hit_version.ts
 *
 * with the most notably change is that it doesn't do any throws but rather just returns undefined
 * if _seq_no or _primary_term does not exist.
 * @param response The response to encode into a version by using _seq_no and _primary_term
 */
export const encodeHitVersion = <T>(hit: T): string | undefined => {
  // Have to do this "as cast" here as these two types aren't included in the SearchResponse hit type
  const { _seq_no: seqNo, _primary_term: primaryTerm } = hit as unknown as {
    _seq_no: number;
    _primary_term: number;
  };

  if (seqNo == null || primaryTerm == null) {
    return undefined;
  } else {
    return Buffer.from(JSON.stringify([seqNo, primaryTerm]), 'utf8').toString('base64');
  }
};
