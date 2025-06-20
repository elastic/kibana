/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldNamesByType, setup } from './helpers';
import { ESQL_STRING_TYPES } from '../../shared/esql_types';
import { getFunctionSuggestions } from '../factories';
import { Location } from '../../definitions/types';

// Suggest new user-defined column
// Suggest fields of string types
// Suggest functions that returns string types or unknown
const PROMPT_SUGGESTIONS = [
  { text: 'col0 = ' },
  ...getFieldNamesByType(ESQL_STRING_TYPES).map((v) => `${v} `),
  ...getFunctionSuggestions({
    location: Location.COMPLETION,
    returnTypes: ['text', 'keyword', 'unknown'],
  }).map((fn) => `${fn.text} `),
];

describe('autocomplete.suggest', () => {
  describe('COMPLETION', () => {
    let assertSuggestions: Awaited<ReturnType<typeof setup>>['assertSuggestions'];

    beforeEach(async () => {
      const setupResult = await setup();
      assertSuggestions = setupResult.assertSuggestions;
    });

    it('suggests PROMPT_SUGGESTIONS + default prompt after COMPLETION keyword', async () => {
      await assertSuggestions(`FROM a | COMPLETION /`, [
        { text: '"${0:Your prompt to the LLM.}"', asSnippet: true },
        ...PROMPT_SUGGESTIONS,
      ]);
    });

    it('suggests PROMPT_SUGGESTIONS when typing a column', async () => {
      await assertSuggestions(`FROM a | COMPLETION kubernetes.some/`, PROMPT_SUGGESTIONS);
    });

    it('suggests PROMPT_SUGGESTIONS + default prompt after after defining a column', async () => {
      await assertSuggestions(`FROM a | COMPLETION /`, [
        { text: '"${0:Your prompt to the LLM.}"', asSnippet: true },
        ...PROMPT_SUGGESTIONS,
      ]);
    });

    it('suggests ASSIGN after the user writes a new custom colum name', async () => {
      await assertSuggestions(`FROM a | COMPLETION newColumn /`, ['= ']);
    });

    it('suggests WITH after the user writes a colum name that already exists', async () => {
      await assertSuggestions(`FROM a | COMPLETION textField /`, ['WITH ']);
    });

    it('suggests WITH after the user writes a param as prompt', async () => {
      await assertSuggestions(`FROM a | COMPLETION ? /`, ['WITH ']);
    });

    it('suggests WITH after the prompt', async () => {
      await assertSuggestions(`FROM a | COMPLETION "prompt" /`, ['WITH ']);
      await assertSuggestions(`FROM a | COMPLETION "prompt" WIT/`, ['WITH ']);
    });

    it('suggests inference endpoints after WITH', async () => {
      await assertSuggestions(`FROM a | COMPLETION "prompt" WITH /`, ['`inference_1` ']);
    });

    it('suggests pipe after complete command', async () => {
      await assertSuggestions(`FROM a | COMPLETION "prompt" WITH inferenceId AS completion /`, [
        '| ',
      ]);
    });
  });
});
