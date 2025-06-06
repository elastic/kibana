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

describe('autocomplete.suggest', () => {
  describe('COMPLETION', () => {
    let assertSuggestions: Awaited<ReturnType<typeof setup>>['assertSuggestions'];

    beforeEach(async () => {
      const setupResult = await setup();
      assertSuggestions = setupResult.assertSuggestions;
    });

    it('suggests columns of STRING types and functions with STRING or UNKNOWN types for the prompt', async () => {
      const expectedSuggestions = [
        ...getFieldNamesByType(ESQL_STRING_TYPES).map((v) => `${v} `),
        ...getFunctionSuggestions({
          location: Location.COMPLETION,
          returnTypes: ['text', 'keyword', 'unknown'],
        }).map((fn) => `${fn.text} `),
      ];

      await assertSuggestions(`FROM a | COMPLETION /`, [
        '"${0:Your prompt to the LLM.}"',
        ...expectedSuggestions,
      ]);

      await assertSuggestions(`FROM a | COMPLETION kubernetes.some/`, expectedSuggestions);
    });

    it('suggests WITH after the prompt', async () => {
      await assertSuggestions(`FROM a | COMPLETION "prompt" /`, ['WITH ']);
      await assertSuggestions(`FROM a | COMPLETION "prompt" WIT/`, ['WITH ']);
    });

    it('suggests nothing after WITH', async () => {
      await assertSuggestions(`FROM a | COMPLETION "prompt" WITH /`, []);
    });

    describe('optional AS', () => {
      it('suggests AS after WITH <inferenceId>', async () => {
        await assertSuggestions(`FROM a | COMPLETION "prompt" WITH inferenceId /`, ['AS ', '| ']);
        await assertSuggestions(`FROM a | COMPLETION "prompt" WITH inferenceId A/`, ['AS ', '| ']);
      });

      it('suggests default target field name for AS clauses', async () => {
        await assertSuggestions(`FROM a | COMPLETION "prompt" WITH inferenceId AS / `, [
          'completion ',
        ]);
      });

      it('suggests pipe after complete command', async () => {
        await assertSuggestions(`FROM a | COMPLETION "prompt" WITH inferenceId AS completion /`, [
          '| ',
        ]);
      });
    });
  });
});
