/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { expectSuggestions, suggest } from '../../../__tests__/commands/autocomplete';
import { mockContext, getMockCallbacks } from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';

const complete = (query: string, expected: string[]) =>
  expectSuggestions(query, expected, mockContext, 'fillnull', undefined, autocomplete);

const valueSuggestions = ['DEFAULT ', 'NULL ', 'true ', 'false ', '"${0:value}"', '${0:0}'];

describe('FILLNULL autocomplete', () => {
  it.each(['', 'D', 'DEF', 'N', 't'])('suggests values after FILLNULL %s', async (prefix) => {
    await complete(`FROM index | FILLNULL ${prefix}`, valueSuggestions);
  });

  it.each(['0', '-1', '1.5', 'true', 'NULL', 'DEFAULT', '?value', '?1', '"on"', '"a,b"'])(
    'suggests ON after %s',
    async (value) => {
      await complete(`FROM index | FILLNULL ${value} `, ['ON ']);
      await complete(`FROM index | FILLNULL ${value} O`, ['ON ']);
      await complete(`FROM index | FILLNULL ${value} ON`, ['ON ']);
    }
  );

  it('suggests fields and a wildcard after ON and commas', async () => {
    const callbacks = getMockCallbacks();
    callbacks.getByType = jest
      .fn()
      .mockResolvedValue([{ label: 'keywordField', text: 'keywordField', kind: 'Field' }]);
    for (const suffix of ['ON ', 'ON doubleField, ', 'ON d']) {
      await expectSuggestions(
        `FROM index | FILLNULL 0 ${suffix}`,
        ['*', 'keywordField'],
        mockContext,
        'fillnull',
        callbacks,
        autocomplete
      );
    }
    expect(callbacks.getByType).toHaveBeenCalledWith('any', ['doubleField']);
  });

  it.each(['doubleField', 'double*', '*', '`any#Char$Field`'])(
    'suggests continuation after %s',
    async (field) => {
      await complete(`FROM index | FILLNULL DEFAULT ON ${field} `, ['| ', '\n', ', ']);
    }
  );

  it('preserves an existing field when inserting a pipe without whitespace', async () => {
    const query = 'FROM index | FILLNULL 0 ON doubleField';
    const suggestions = await suggest(query, mockContext, 'fillnull', undefined, autocomplete);
    const pipe = suggestions.find(({ label }) => label === '|');
    expect(pipe?.text).toBe('doubleField | ');
  });

  it('offers scalar value parameters', async () => {
    const context = {
      ...mockContext,
      variables: [{ key: 'replacement', type: ESQLVariableType.VALUES, value: 'unknown' }],
    };
    await expectSuggestions(
      'FROM index | FILLNULL ',
      [...valueSuggestions, '?replacement'],
      context,
      'fillnull',
      undefined,
      autocomplete
    );
  });

  it('uses the cursor position when editing before an existing ON clause', async () => {
    const query = 'FROM index | FILLNULL DEFAULT ON doubleField';
    const offset = query.indexOf('DEFAULT');
    await expectSuggestions(
      query,
      valueSuggestions,
      mockContext,
      'fillnull',
      undefined,
      autocomplete,
      offset
    );
  });
});
