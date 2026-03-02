/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { expectErrors } from '../../../__tests__/commands/validation';
import { validate } from './validate';
import type { ESQLColumnData } from '../types';

const mmrExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'mmr', validate);
};

const buildContextWithDenseVector = () => {
  const columns = new Map<string, ESQLColumnData>(mockContext.columns);
  columns.set('denseField', { name: 'denseField', type: 'dense_vector', userDefined: false });

  return {
    ...mockContext,
    columns,
  };
};

describe('MMR Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates basic MMR query with required arguments', () => {
    const context = buildContextWithDenseVector();
    mmrExpectErrors('FROM index | MMR ON denseField LIMIT 10', [], context);
  });

  it('raises error when query vector has unsupported type', () => {
    const context = buildContextWithDenseVector();
    mmrExpectErrors(
      'FROM index | MMR keywordField ON denseField LIMIT 10',
      ['[MMR] Query vector must be of type dense_vector. Found keyword'],
      context
    );
  });

  it('raises error when ON field type is unsupported', () => {
    mmrExpectErrors('FROM index | MMR ON keywordField LIMIT 10', [
      '[MMR] ON field must be of type dense_vector. Found keyword',
    ]);
  });

  it('raises error when lambda has unsupported type', () => {
    const context = buildContextWithDenseVector();
    mmrExpectErrors(
      'FROM index | MMR ON denseField LIMIT 10 WITH { "lambda": "invalid" }',
      ['Invalid type for parameter "lambda". Expected type: double. Received: keyword.'],
      context
    );
  });
});
