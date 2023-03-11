/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './kbn_rison';

import { encode, encodeUnknown, decode, encodeArray, decodeArray } from './kbn_rison';
// maintain compatibility with 'rison-node' and include a default export
// eslint-disable-next-line import/no-default-export
export default {
  encode,
  encodeUnknown,
  decode,
  encodeArray,
  decodeArray,
};
