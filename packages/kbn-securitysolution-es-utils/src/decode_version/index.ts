/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Similar to the src/core/server/saved_objects/version/decode_version.ts
// with the notable differences in that it is more tolerant and does not throw saved object specific errors
// but rather just returns an empty object if it cannot parse the version or cannot find one.
export const decodeVersion = (
  version: string | undefined
):
  | {
      ifSeqNo: number;
      ifPrimaryTerm: number;
    }
  | {} => {
  if (version != null) {
    try {
      const decoded = Buffer.from(version, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && Number.isInteger(parsed[0]) && Number.isInteger(parsed[1])) {
        return {
          if_primary_term: parsed[1],
          if_seq_no: parsed[0],
        };
      } else {
        return {};
      }
    } catch (err) {
      // do nothing here, this is on purpose and we want to return any empty object when we can't parse.
      return {};
    }
  } else {
    return {};
  }
};
