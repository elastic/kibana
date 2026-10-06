/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * from './kbn_rison';
import type { encode, encodeUnknown, decode, encodeArray, decodeArray } from './kbn_rison';
declare const _default: {
  encode: typeof encode;
  encodeUnknown: typeof encodeUnknown;
  decode: typeof decode;
  encodeArray: typeof encodeArray;
  decodeArray: typeof decodeArray;
};
export default _default;
