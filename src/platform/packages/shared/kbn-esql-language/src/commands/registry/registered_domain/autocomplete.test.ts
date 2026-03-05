/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  suggest,
  expectSuggestions,
  getFieldNamesByType,
  mockFieldsWithTypes,
} from '../../../__tests__/commands/autocomplete';
import { getMockCallbacks, mockContext } from '../../../__tests__/commands/context_fixtures';
import { ESQL_STRING_TYPES } from '../../definitions/types';
import { autocomplete } from './autocomplete';

const COMMAND_NAME = 'registered_domain';

describe('REGISTERED_DOMAIN > autocomplete', () => {
  describe('after REGISTERED_DOMAIN keyword', () => {
    it('suggests a new column name', async () => {
      const result = await suggest(
        'FROM index | REGISTERED_DOMAIN ',
        mockContext,
        COMMAND_NAME,
        getMockCallbacks(),
        autocomplete
      );

      expect(result.some((suggestion) => suggestion.text.includes('='))).toBe(true);
    });
  });

  describe('after prefix column', () => {
    it('suggests = assignment operator', async () => {
      await expectSuggestions(
        'FROM index | REGISTERED_DOMAIN prefix ',
        ['= '],
        mockContext,
        COMMAND_NAME,
        getMockCallbacks(),
        autocomplete
      );
    });
  });

  describe('after = assignment', () => {
    it('suggests string fields', async () => {
      const mockCallbacks = getMockCallbacks();
      const stringFields = getFieldNamesByType(ESQL_STRING_TYPES);
      mockFieldsWithTypes(mockCallbacks, stringFields);

      const result = await suggest(
        'FROM index | REGISTERED_DOMAIN prefix = ',
        mockContext,
        COMMAND_NAME,
        mockCallbacks,
        autocomplete
      );

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('after complete command', () => {
    it('suggests pipe', async () => {
      await expectSuggestions(
        'FROM index | REGISTERED_DOMAIN prefix = host ',
        ['| '],
        mockContext,
        COMMAND_NAME,
        getMockCallbacks(),
        autocomplete
      );
    });
  });
});
