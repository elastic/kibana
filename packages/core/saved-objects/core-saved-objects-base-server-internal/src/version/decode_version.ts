/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';
import { decodeBase64 } from './base64';

/**
 * Decode the "opaque" version string to the sequence params we
 * can use to activate optimistic concurrency in Elasticsearch
 */
export function decodeVersion(version?: string) {
  try {
    if (typeof version !== 'string') {
      throw new TypeError();
    }

    const seqParams = JSON.parse(decodeBase64(version)) as [number, number];

    if (
      !Array.isArray(seqParams) ||
      seqParams.length !== 2 ||
      !Number.isInteger(seqParams[0]) ||
      !Number.isInteger(seqParams[1])
    ) {
      throw new TypeError();
    }

    return {
      _seq_no: seqParams[0],
      _primary_term: seqParams[1],
    };
  } catch (_) {
    throw SavedObjectsErrorHelpers.createInvalidVersionError(version);
  }
}
