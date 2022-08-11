/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// This is server-side continuation of examples/field_formats_example/public/examples/2_creating_custom_formatter.ts

import { FieldFormatsSetup } from '@kbn/field-formats-plugin/server';

import { ExampleCurrencyFormat } from '../../common';

// When registering a field formatter, be sure to also register it server-side.
// This would be needed, for example, for CSV generation, as reports are generated server-side.
export function registerExampleFormat(fieldFormats: FieldFormatsSetup) {
  fieldFormats.register(ExampleCurrencyFormat);
}
