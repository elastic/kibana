/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_STRING_TYPES } from '../../shared/esql_types';
import { attachTriggerCommand, getFieldNamesByType, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('GROK', () => {
    it('suggests fields after GROK', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        'from a | grok /',
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
      );
      await assertSuggestions(
        'from a | grok key/',
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
      );
      await assertSuggestions(
        'from a | grok keywordField/',
        ['keywordField ', 'textField '].map(attachTriggerCommand)
      );
    });

    const constantPattern = '"%{WORD:firstWord}"';
    it('suggests a pattern after a field name', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | grok keywordField /', [constantPattern + ' ']);
    });

    it('suggests a pipe after a pattern', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(`from a | grok keywordField ${constantPattern} /`, ['| ']);
    });
  });
});
