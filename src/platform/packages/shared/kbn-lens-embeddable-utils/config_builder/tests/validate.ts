/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';

import { LensConfigBuilder } from '../config_builder';
import type { LensAttributes } from '../types';
import { lensApiStateSchema } from '../schema';

/**
 * Test harness to validate LensConfigBuilder conversions
 *
 * - Starts with LensAttributes
 * - Converts to API format
 * - Validates against the provided schema
 * - Validates against the general lensApiStateSchema
 * - Converts back to LensAttributes
 * - Converts new LensAttributes to API format
 * - Validates against the provided schema
 * - Validates against the general lensApiStateSchema
 */
export function validateConverter(attributes: LensAttributes, schema: Type<any>) {
  const builder = new LensConfigBuilder();

  const newApiConfig = builder.toAPIFormat(attributes);

  expect(() => {
    schema.validate(newApiConfig);
  }).not.toThrow();

  expect(() => {
    lensApiStateSchema.validate(newApiConfig);
  }).not.toThrow();

  const newLensAttributes = builder.fromAPIFormat(newApiConfig);

  const newApiConfig2 = builder.toAPIFormat(newLensAttributes);

  expect(() => {
    schema.validate(newApiConfig2);
  }).not.toThrow();

  expect(() => {
    lensApiStateSchema.validate(newApiConfig2);
  }).not.toThrow();

  expect(newApiConfig).toEqual(newApiConfig2);
}
