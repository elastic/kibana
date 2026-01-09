/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { getNoValidCallSignatureError } from '../../definitions/utils/validation/utils';
import type { ICommandContext } from '../types';

const sortExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'sort', validate);
};

describe('SORT Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    const newColumns = new Map(mockContext.columns);

    newColumns.set('COUNT(*)', {
      name: 'COUNT(*)',
      type: 'integer',
      location: { min: 0, max: 10 },
      userDefined: true,
    });
    const context: ICommandContext = {
      ...mockContext,
      columns: newColumns,
    };
    sortExpectErrors('from a_index | sort "field" ', []);
    sortExpectErrors('from a_index | sort wrongField ', ['Unknown column "wrongField"']);
    sortExpectErrors('from a_index | sort doubleField, textField', []);
    for (const dir of ['desc', 'asc']) {
      sortExpectErrors(`from a_index | sort "field" ${dir} `, []);
      sortExpectErrors(`from a_index | sort doubleField ${dir} `, []);
      for (const nullDir of ['first', 'last']) {
        sortExpectErrors(`from a_index | sort doubleField ${dir} nulls ${nullDir}`, []);
      }
    }
    for (const nullDir of ['first', 'last']) {
      sortExpectErrors(`from a_index | sort doubleField nulls ${nullDir}`, []);
    }
    sortExpectErrors(`row a = 1 | stats COUNT(*) | sort \`COUNT(*)\``, [], context);
  });
  test('sorting by expressions', () => {
    // SORT accepts complex expressions
    sortExpectErrors(
      'from a_index | sort abs(doubleField) - to_long(textField) desc nulls first',
      []
    );

    // Expression parts are also validated
    sortExpectErrors('from a_index | sort sin(textField)', [
      getNoValidCallSignatureError('sin', ['text']),
    ]);

    // Expression parts are also validated
    sortExpectErrors('from a_index | sort doubleField + textField', [
      getNoValidCallSignatureError('+', ['double', 'text']),
    ]);
  });
});
