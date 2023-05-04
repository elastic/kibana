/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

// 1. Assume we have an existing field format configuration serialized and saved somewhere
// In this case it is `bytes` field formatter with a configured `'0.00b'` pattern
// NOTE: the `params` field is not type checked and a consumer has to know the `param` format that a particular `formatId` expects,
// https://github.com/elastic/kibana/issues/108158
export const sampleSerializedFieldFormat: SerializedFieldFormat<{ pattern: string }> = {
  id: 'bytes',
  params: {
    pattern: '0.00b',
  },
};

export function getSample(fieldFormats: FieldFormatsStart) {
  // 2. we create a field format instance from an existing configuration
  const fieldFormat = fieldFormats.deserialize(sampleSerializedFieldFormat);

  // 3. now we can use it to convert values
  const pairs = [1000, 100000, 100000000].map((value) => ({
    raw: value,
    formatted: fieldFormat.convert(value),
  }));

  return pairs;
}
