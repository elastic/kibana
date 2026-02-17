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
import { camelCase } from 'lodash';

const enrichExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'enrich', validate);
};

describe('ENRICH Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    enrichExpectErrors(`FROM a_index | ENRICH policy `, []);
  });

  test('validates the coordinators', () => {
    for (const value of ['any', 'coordinator', 'remote']) {
      enrichExpectErrors(`FROM a_index | enrich _${value}:policy `, []);
      enrichExpectErrors(`FROM a_index | enrich _${value} :  policy `, [
        `Unknown policy "_${value}"`,
      ]);
      enrichExpectErrors(`FROM a_index | enrich _${value}:  policy `, [
        `Unknown policy "_${value}"`,
      ]);
      enrichExpectErrors(`FROM a_index | enrich _${camelCase(value)}:policy `, []);
      enrichExpectErrors(`FROM a_index | enrich _${value.toUpperCase()}:policy `, []);
    }

    enrichExpectErrors(`FROM a_index | enrich _unknown:policy`, [
      'Unrecognized value "_unknown" for ENRICH, mode needs to be one of [_any, _coordinator, _remote]',
    ]);
    enrichExpectErrors(`FROM a_index | enrich any:policy`, [
      'Unrecognized value "any" for ENRICH, mode needs to be one of [_any, _coordinator, _remote]',
    ]);
  });
  test('raises error on unknown policy', () => {
    enrichExpectErrors(`FROM a_index | enrich _`, ['Unknown policy "_"']);
    enrichExpectErrors(`FROM a_index | enrich _:`, ['Unknown policy "_"']);
    enrichExpectErrors(`FROM a_index | enrich any:`, ['Unknown policy "any"']);
    enrichExpectErrors(`FROM a_index | enrich _:policy`, [
      'Unrecognized value "_" for ENRICH, mode needs to be one of [_any, _coordinator, _remote]',
    ]);
    enrichExpectErrors(`FROM a_index | enrich _any:`, ['Unknown policy "_any"']);
    enrichExpectErrors('FROM a_index | enrich `this``is fine`', ['Unknown policy "`this``is"']);
    enrichExpectErrors('FROM a_index | enrich this is fine', ['Unknown policy "this"']);
    enrichExpectErrors(`FROM a_index |enrich missing-policy `, ['Unknown policy "missing-policy"']);
  });

  test('validates match field', () => {
    enrichExpectErrors(`FROM a_index | ENRICH policy ON b `, ['Unknown column "b"']);

    enrichExpectErrors('FROM a_index | ENRICH policy ON `this``is fine`', [
      'Unknown column "this`is fine"',
    ]);
    enrichExpectErrors('FROM a_index | ENRICH policy ON this is fine', ['Unknown column "this"']);
  });

  test('validates enrich fields against policy', () => {
    // otherField and yetAnotherField are enrich fields in the policy
    enrichExpectErrors(`FROM a_index | ENRICH policy ON textField WITH otherField `, []);
    enrichExpectErrors(
      `FROM a_index | ENRICH policy ON textField WITH otherField, newname = yetAnotherField `,
      []
    );

    // keywordField is a field in the index, but not an enrich field
    enrichExpectErrors(`FROM a_index | ENRICH policy ON textField WITH keywordField `, [
      'Unknown column "keywordField"',
    ]);

    // col1 shouldn't be validated, only foo
    enrichExpectErrors(`FROM a_index |ENRICH policy ON doubleField WITH col1 = foo`, [
      'Unknown column "foo"',
    ]);
  });
});
