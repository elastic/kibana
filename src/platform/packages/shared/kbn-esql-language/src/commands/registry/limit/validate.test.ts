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

const limitExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'limit', validate);
};

describe('LIMIT Validation', () => {
  test('allows LIMIT and LIMIT BY without SORT before it', () => {
    limitExpectErrors('from a | limit 10', []);
    limitExpectErrors('from a | limit 10 by keywordField', []);
  });

  test('disallows SORT before LIMIT BY', () => {
    limitExpectErrors('from a | sort keywordField | limit 10 by keywordField', [
      'SORT before LIMIT BY is not supported yet.',
    ]);
  });
});
