/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';

import { ExampleCurrencyFormat } from '../../common';

export function registerExampleFormat(fieldFormats: FieldFormatsSetup) {
  // 5.1 Register a field format. This should happen in setup plugin lifecycle phase.
  fieldFormats.register([ExampleCurrencyFormat]);
}

// 5.2 also register a field formatter with the same `formatId` server-side.
// This is required for some server-side features like CSV export,
// see: examples/field_formats_example/public/examples/2_creating_custom_formatter.ts

// 6. Now let's apply the formatter to some sample values
export function getSample(fieldFormats: FieldFormatsStart) {
  const exampleSerializedFieldFormat: SerializedFieldFormat<{ currency: string }> = {
    id: 'example-currency',
    params: {
      currency: 'USD',
    },
  };

  const fieldFormat = fieldFormats.deserialize(exampleSerializedFieldFormat);

  const pairs = [1000, 100000, 100000000].map((value) => ({
    raw: value,
    formatted: fieldFormat.convert(value),
  }));

  return pairs;
}
