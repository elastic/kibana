/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CloseAlertParamsSchema, CreateAlertParamsSchema } from './v1';
import { MESSAGE_SCHEMA_MAX_LENGTH } from '../constants';
import {
  JiraServiceManagementCloseAlertExample,
  JiraServiceManagementCreateAlertExample,
  ValidCreateAlertSchema,
} from './test_schema';

describe('opsgenie schema', () => {
  describe('CreateAlertParamsSchema', () => {
    it.each([
      ['ValidCreateAlertSchema', ValidCreateAlertSchema],
      ['JiraServiceManagementCreateAlertExample', JiraServiceManagementCreateAlertExample],
    ])('validates the test object [%s] correctly', (objectName, testObject) => {
      expect(() => CreateAlertParamsSchema.parse(testObject)).not.toThrow();
    });

    it.each([
      ['length 1', 'a'],
      ['length 130', 'a'.repeat(130)],
      ['length 131', 'a'.repeat(131)],
      ['length MESSAGE_SCHEMA_MAX_LENGTH', 'a'.repeat(MESSAGE_SCHEMA_MAX_LENGTH)],
    ])('accepts a message of %s', (_name, message) => {
      expect(() => CreateAlertParamsSchema.parse({ message })).not.toThrow();
    });

    it.each([
      ['length MESSAGE_SCHEMA_MAX_LENGTH + 1', 'a'.repeat(MESSAGE_SCHEMA_MAX_LENGTH + 1)],
      ['empty', ''],
      ['whitespace-only', '   '],
    ])('rejects a message that is %s', (_name, message) => {
      expect(() => CreateAlertParamsSchema.parse({ message })).toThrow();
    });
  });

  describe('CloseAlertParamsSchema', () => {
    it.each([['JiraServiceManagementCloseAlertExample', JiraServiceManagementCloseAlertExample]])(
      'validates the test object [%s] correctly',
      (objectName, testObject) => {
        expect(() => CloseAlertParamsSchema.parse(testObject)).not.toThrow();
      }
    );
  });
});
