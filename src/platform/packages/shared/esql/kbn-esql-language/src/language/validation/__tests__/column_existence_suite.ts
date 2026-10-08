/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { times } from 'lodash';
import type { Setup } from './helpers';

export const runColumnExistenceValidationSuite = (setup: Setup) => {
  describe('column existence checks', () => {
    it('looks behind current command', async () => {
      const { expectErrors } = await setup();
      await expectErrors('FROM index | DROP keywordField | KEEP keywordField', [
        'Unknown column "keywordField"',
      ]);
    });

    it('knows the columns a HIGHLIGHT without a query reuses from a full-text WHERE', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'FROM index | WHERE MATCH(textField, "x") | HIGHLIGHT | KEEP highlight_textField',
        []
      );
    });

    it('reports a HIGHLIGHT column whose WHERE has no full-text condition to reuse', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'FROM index | WHERE keywordField == "x" | HIGHLIGHT | KEEP highlight_keywordField',
        ['Unknown column "highlight_keywordField"']
      );
    });

    it('reports a HIGHLIGHT column whose WHERE is cut off by a STATS', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'FROM index | WHERE MATCH(textField, "x") | STATS COUNT(*) BY textField | HIGHLIGHT | KEEP highlight_textField',
        ['Unknown column "highlight_textField"']
      );
    });

    it('treats FORK branches separately', async () => {
      const { expectErrors } = await setup();
      await expectErrors('FROM index | FORK (DROP keywordField) (KEEP keywordField)', []);
    });

    it('makes STATS generated columns available after inline WHERE filters', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'FROM index | STATS COUNT() WHERE integerField > 0 | EVAL result = `COUNT() WHERE integerField > 0` + 1',
        []
      );
    });

    it('returns a warning instead of an error when unmapped_fields is LOAD or NULLIFY', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'SET unmapped_fields = "LOAD"; FROM index | WHERE unmapped == ""',
        [],
        [
          `"unmapped" column isn't mapped in any searched indices.\nIf you are not intentionally referencing an unmapped field,\ncheck that the field exists or that it is spelled correctly in your query.`,
        ]
      );
    });

    it('warns when accessing an unsupported field in KEEP or DROP', async () => {
      const { expectErrors } = await setup();
      const warning =
        'Field "unsupportedField" cannot be retrieved, it is unsupported or not indexed; returning null';
      await expectErrors('from a_index | keep unsupportedField', [], [warning]);
      await expectErrors('from a_index | drop unsupportedField', [], [warning]);
    });

    it('errors when accessing an unsupported field outside KEEP or DROP', async () => {
      const { expectErrors } = await setup();
      await expectErrors('from a_index | sort unsupportedField', [
        'Field "unsupportedField" cannot be retrieved, it is unsupported or not indexed; returning null',
      ]);
    });

    it('reports conflicting column types with original types', async () => {
      const { expectErrors } = await setup();
      const message =
        'Column [conflictingField] has conflicting types across indices: [text], [keyword]';

      await expectErrors('from conflict_index | keep conflictingField', [], [message]);
      await expectErrors('from conflict_index | drop conflictingField', [], [message]);
      await expectErrors('from conflict_index | sort conflictingField', [message]);
    });

    it('returns one warning for each instance of the same unmapped column', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'SET unmapped_fields = "LOAD"; FROM index | WHERE unmapped == "" | KEEP unmapped',
        [],

        times(
          2,
          () =>
            `"unmapped" column isn't mapped in any searched indices.\nIf you are not intentionally referencing an unmapped field,\ncheck that the field exists or that it is spelled correctly in your query.`
        )
      );
    });
  });
};
