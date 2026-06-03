/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Setup } from './helpers';

export const runSourcesValidationSuite = (setup: Setup) => {
  // The following block tests a case that is allowed in Kibana
  // by suppressing the parser error in https://github.com/elastic/esql-js/blob/main/src/parser/core/esql_error_listener.ts
  describe('EMPTY query does NOT produce syntax error', () => {
    it('does not produce a syntax error for empty or whitespace-only queries', async () => {
      const { expectErrors } = await setup();
      await expectErrors('', []);
      await expectErrors(' ', []);
      await expectErrors('     ', []);
    });
  });

  describe('FROM <sources> [ METADATA <indices> ]', () => {
    test('errors on invalid command start', async () => {
      const { expectErrors } = await setup();

      await expectErrors('f', [expect.any(String)]);
      await expectErrors('from ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, '(', UNQUOTED_SOURCE}",
      ]);
    });

    describe('... <sources> ...', () => {
      test('errors on trailing comma', async () => {
        const { expectErrors } = await setup();

        await expectErrors('from index,', [
          "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, '(', UNQUOTED_SOURCE}",
        ]);
        await expectErrors(`FROM index\n, \tother_index\t,\n \t `, [
          "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, '(', UNQUOTED_SOURCE}",
        ]);

        await expectErrors(`from assignment = 1`, [
          "SyntaxError: mismatched input '=' expecting <EOF>",
          'Unknown data source "assignment"',
        ]);
      });

      test('errors on invalid syntax', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM `index`', ['Unknown data source "`index`"']);
        await expectErrors(`from assignment = 1`, [
          "SyntaxError: mismatched input '=' expecting <EOF>",
          'Unknown data source "assignment"',
        ]);
      });
    });

    describe('hidden sources', () => {
      test('does not error on dot-prefixed backing index', async () => {
        const { expectErrors } = await setup();
        await expectErrors('FROM .ds-log-elasticsearch-default-2025.09.11-000006', []);
      });

      test('does not error on mix of backing index and known index', async () => {
        const { expectErrors } = await setup();
        await expectErrors('FROM .ds-foo,index', []);
      });

      test('does not error on CCS backing index', async () => {
        const { expectErrors } = await setup();
        await expectErrors('FROM "mycluster:.ds-foo"', []);
      });

      test('still errors on truly unknown non-dot sources', async () => {
        const { expectErrors } = await setup();
        await expectErrors('FROM truly_unknown', ['Unknown data source "truly_unknown"']);
      });

      test('still errors on mix where one part is unknown and not dot-prefixed', async () => {
        const { expectErrors } = await setup();
        await expectErrors('FROM truly_unknown,index', ['Unknown data source "truly_unknown"']);
      });
    });

    describe('... METADATA <indices>', () => {
      test('errors when wrapped in parentheses', async () => {
        const { expectErrors } = await setup();

        await expectErrors(`from index (metadata _id)`, [
          "SyntaxError: mismatched input '(' expecting <EOF>",
        ]);
      });

      describe('validates fields', () => {
        test('validates fields', async () => {
          const { expectErrors } = await setup();
          await expectErrors(`from index metadata _id, _source METADATA _id2`, [
            "SyntaxError: mismatched input 'METADATA' expecting <EOF>",
          ]);
        });
      });
    });
  });
};
