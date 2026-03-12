/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CloseAlertParamsSchema, CreateAlertParamsSchema } from './v1';
import {
  OpsgenieCloseAlertExample,
  OpsgenieCreateAlertExample,
  ValidCreateAlertSchema,
} from './test_schema';

describe('opsgenie schema', () => {
  describe('CreateAlertParamsSchema', () => {
    it.each([
      ['ValidCreateAlertSchema', ValidCreateAlertSchema],
      ['OpsgenieCreateAlertExample', OpsgenieCreateAlertExample],
    ])('validates the test object [%s] correctly', (objectName, testObject) => {
      expect(() => CreateAlertParamsSchema.parse(testObject)).not.toThrow();
    });
  });

  describe('CloseAlertParamsSchema', () => {
    it.each([['OpsgenieCloseAlertExample', OpsgenieCloseAlertExample]])(
      'validates the test object [%s] correctly',
      (objectName, testObject) => {
        expect(() => CloseAlertParamsSchema.parse(testObject)).not.toThrow();
      }
    );
  });
});
