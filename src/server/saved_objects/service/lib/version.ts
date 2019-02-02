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

import { createInvalidVersionError } from './errors';

const decodeBase64 = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');
const encodeBase64 = (utf8: string) => Buffer.from(utf8, 'utf8').toString('base64');

/**
 * Encode the sequence params into an "opaque" version string
 * that can be used in the saved object API in place of numeric
 * version numbers
 */
export function encodeVersion(seqNo: number, primaryTerm: number) {
  if (!Number.isInteger(primaryTerm)) {
    throw new TypeError('_primary_term from elasticsearch must be an integer');
  }

  if (!Number.isInteger(seqNo)) {
    throw new TypeError('_seq_no from elasticsearch must be an integer');
  }

  return encodeBase64(JSON.stringify([seqNo, primaryTerm]));
}

/**
 * Helper for encoding a version from a "hit" (hits.hits[#] from _search) or
 * "doc" (body from GET, update, etc) object
 */
export function encodeHitVersion(response: { _seq_no: number; _primary_term: number }) {
  return encodeVersion(response._seq_no, response._primary_term);
}

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
      !seqParams ||
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
    throw createInvalidVersionError(version);
  }
}

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
