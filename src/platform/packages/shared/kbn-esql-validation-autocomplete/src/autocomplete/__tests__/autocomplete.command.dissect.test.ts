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
  describe('DISSECT', () => {
    it('suggests fields after DISSECT', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        'from a | DISSECT /',
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
      );
      await assertSuggestions(
        'from a | DISSECT /',
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `),
        { triggerCharacter: ' ' }
      );
      await assertSuggestions(
        'from a | DISSECT key/',
        getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
      );
      await assertSuggestions(
        'from a | DISSECT keywordField/',
        ['keywordField ', 'textField '].map(attachTriggerCommand)
      );
    });

    const constantPattern = '"%{firstWord}" ';
    it('suggests a pattern after a field name', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | DISSECT keywordField /', [constantPattern]);
    });

    it('suggests an append separator or pipe after a pattern', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions(
        `from a | DISSECT keywordField ${constantPattern} /`,
        ['APPEND_SEPARATOR = ', '| '].map(attachTriggerCommand),
        { triggerCharacter: ' ' }
      );
      assertSuggestions(
        `from a | DISSECT keywordField ${constantPattern} /`,
        ['APPEND_SEPARATOR = ', '| '].map(attachTriggerCommand)
      );
    });

    it('suggests append separators', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        `from a | DISSECT keywordField ${constantPattern} append_separator = /`,
        ['":" ', '";" '].map(attachTriggerCommand)
      );
    });

    it('suggests a pipe after an append separator', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        `from a | DISSECT keywordField ${constantPattern} append_separator = ":" /`,
        ['| ']
      );
    });
  });
});
