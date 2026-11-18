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

    it('knows the HIGHLIGHT columns of a QSTR WHERE after its text columns are removed', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'FROM index | WHERE QSTR("x") | KEEP integerField | EVAL label = TO_STRING(integerField) | HIGHLIGHT | KEEP highlight_label',
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

    it('accepts a key written under a flattened field', async () => {
      const { expectErrors } = await setup();
      await expectErrors('FROM index | WHERE flattenedField.env == "prod"', []);
      await expectErrors('FROM index | KEEP flattenedField.env', []);
      await expectErrors(
        'FROM index | WHERE flattenedField.env == "prod" | KEEP flattenedField.env',
        []
      );
      await expectErrors(
        'FROM index | KEEP flattenedField.env | WHERE flattenedField.env == "staging"',
        []
      );
      await expectErrors('FROM index | STATS COUNT(*) BY flattenedField.nested.region', []);
      await expectErrors(
        'FROM (FROM index | KEEP flattenedField.env) | KEEP flattenedField.env',
        []
      );
      await expectErrors(
        'FROM index | WHERE keywordField IN (FROM other_index | KEEP flattenedField.env) | DROP flattenedField | WHERE flattenedField.env == "prod"',
        ['Unknown column "flattenedField.env"']
      );
    });

    it('still reports an unknown column under a field that is not flattened', async () => {
      const { expectErrors } = await setup();
      await expectErrors('FROM index | WHERE keywordField.env == "prod"', [
        'Unknown column "keywordField.env"',
      ]);
      await expectErrors('FROM index | WHERE kubernetes.something.something.extra == 1', [
        'Unknown column "kubernetes.something.something.extra"',
      ]);
    });

    it('does not treat a flattened key as an unmapped field when unmapped fields are loaded', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'SET unmapped_fields = "LOAD"; FROM index | WHERE flattenedField.env == "prod" | KEEP flattenedField.env',
        [],
        []
      );
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
