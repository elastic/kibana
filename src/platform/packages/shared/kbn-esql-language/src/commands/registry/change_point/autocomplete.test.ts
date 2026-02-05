/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, getMockCallbacks } from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/commands/autocomplete';
import type { ICommandCallbacks } from '../types';
import { ESQL_NUMBER_TYPES } from '../../definitions/types';

const changePointExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'change_point',
    mockCallbacks,
    autocomplete
  );
};

describe('CHANGE_POINT Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    mockCallbacks = getMockCallbacks();
    jest.clearAllMocks();
  });
  it('suggests value columns of numeric types', async () => {
    const expectedNumericFields = getFieldNamesByType(ESQL_NUMBER_TYPES);
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedNumericFields.map((name) => ({ label: name, text: name }))
    );
    await changePointExpectSuggestions(
      `from a | change_point /`,
      expectedNumericFields,
      mockCallbacks
    );
  });

  it('suggests ON after value column', async () => {
    await changePointExpectSuggestions(`from a | change_point value /`, ['ON ', 'AS ', '| ']);
  });

  it('suggests fields after ON', async () => {
    const expectedFields = getFieldNamesByType('any');
    await changePointExpectSuggestions(`from a | change_point value on /`, expectedFields);

    await changePointExpectSuggestions(`from a | change_point value on fi/`, expectedFields);
  });

  describe('AS', () => {
    it('suggests AS after ON <field>', async () => {
      await changePointExpectSuggestions(`from a | change_point value on field `, ['AS ', '| ']);
    });

    it('suggests default field name for AS clauses with an empty ON', async () => {
      await changePointExpectSuggestions(`from a | change_point value as `, ['changePointType, ']);

      await changePointExpectSuggestions(
        `from a | change_point value on field as changePointType,/`,
        ['pValue']
      );
    });

    it('suggests default field name for AS clauses', async () => {
      await changePointExpectSuggestions(`from a | change_point value on field as `, [
        'changePointType, ',
      ]);

      await changePointExpectSuggestions(
        `from a | change_point value on field as changePointType,/`,
        ['pValue']
      );
    });

    it('suggests a default pValue column name', async () => {
      await changePointExpectSuggestions(
        `from a | change_point value on field as changePointType,pValu/`,
        ['pValue']
      );
    });

    it('suggests pipe after complete command', async () => {
      await changePointExpectSuggestions(
        `from a | change_point value on field as changePointType, pValue `,
        ['| ']
      );
    });
  });
});
