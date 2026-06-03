/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { EditorError } from '@elastic/esql/types';
import type { ESQLMessage } from '../../../commands';
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

  describe('callbacks', () => {
    it('should not fetch source and fields list when a row command is set', async () => {
      const { validate, callbacks } = await setup();
      await validate(`row a = 1 | eval a`, callbacks);
      expect(callbacks.getColumnsFor).not.toHaveBeenCalled();
      expect(callbacks.getSources).not.toHaveBeenCalled();
    });

    it('should not fetch policies if no enrich command is found', async () => {
      const { validate, callbacks } = await setup();
      await validate(`row a = 1 | eval a`, callbacks);
      expect(callbacks.getPolicies).not.toHaveBeenCalled();
    });

    it('should not fetch source and fields for empty command', async () => {
      const { validate, callbacks } = await setup();
      await validate(` `, callbacks);
      expect(callbacks.getColumnsFor).not.toHaveBeenCalled();
      expect(callbacks.getSources).not.toHaveBeenCalled();
    });

    it('should skip initial source and fields call but still call fields for enriched policy', async () => {
      const { validate, callbacks } = await setup();
      await validate(`row a = 1 | eval b  = a | enrich policy`, callbacks);
      expect(callbacks.getSources).not.toHaveBeenCalled();
      expect(callbacks.getPolicies).toHaveBeenCalled();
      expect(callbacks.getColumnsFor).toHaveBeenCalledTimes(0);
    });

    it('should fetch additional fields if an enrich command is found', async () => {
      const { validate, callbacks } = await setup();
      await validate(`from a_index | eval b  = a | enrich policy`, callbacks);
      expect(callbacks.getSources).toHaveBeenCalled();
      expect(callbacks.getPolicies).toHaveBeenCalled();
    });

    it('should not crash if no callbacks are available', async () => {
      const { validate } = await setup();
      await expect(
        validate(`from a_index | eval b  = a | enrich policy | dissect textField "%{firstWord}"`, {
          getColumnsFor: undefined,
          getSources: undefined,
          getPolicies: undefined,
        })
      ).resolves.toBeDefined();
    });

    it('should not crash if no callbacks are passed', async () => {
      const { validate } = await setup();
      await expect(
        validate(`from a_index | eval b  = a | enrich policy | dissect textField "%{firstWord}"`)
      ).resolves.toBeDefined();
    });
  });

  describe('ignoring errors based on callbacks', () => {
    const callbackScenarios = [
      {
        callback: 'getSources' as keyof ESQLCallbacks,
        codes: ['unknownIndex', 'unknownDataSource'],
        queries: ['FROM unknown_index', 'FROM index, unknown_index'],
      },
      {
        callback: 'getColumnsFor' as keyof ESQLCallbacks,
        codes: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
        queries: [
          'FROM index | KEEP unknownColumn',
          'FROM index | EVAL rounded = ROUND(keywordField)',
          'FROM index | KEEP unsupportedField',
        ],
      },
      {
        callback: 'getPolicies' as keyof ESQLCallbacks,
        codes: ['unknownPolicy'],
        queries: ['FROM index | ENRICH unknown_policy'],
      },
    ];

    it.each(callbackScenarios)(
      'suppresses $callback-dependent errors when $callback is missing',
      async ({ callback, codes, queries }) => {
        const { validate, callbacks } = await setup();
        const collectErrorCodes = async (query: string, cb: ESQLCallbacks) =>
          (await validate(query, cb)).errors.map((e) => e.code);

        const codesWithAllCallbacks = (
          await Promise.all(queries.map((query) => collectErrorCodes(query, callbacks)))
        ).flat();
        expect(codes.some((code) => codesWithAllCallbacks.includes(code))).toBe(true);

        const partialCallbacks = { ...callbacks, [callback]: undefined };
        const codesWithoutCallback = (
          await Promise.all(queries.map((query) => collectErrorCodes(query, partialCallbacks)))
        ).flat();
        for (const code of codes) {
          expect(codesWithoutCallback).not.toContain(code);
        }
      }
    );

    it('suppresses all callback-dependent errors when no callback is passed', async () => {
      const { validate } = await setup();
      const allCodes = callbackScenarios.flatMap(({ codes }) => codes);
      const reportedCodes = (
        await Promise.all(
          callbackScenarios.flatMap(({ queries }) =>
            queries.map(async (query) => (await validate(query, {})).errors.map((e) => e.code))
          )
        )
      ).flat();
      for (const code of allCodes) {
        expect(reportedCodes).not.toContain(code);
      }
    });
  });

  describe('error tagging behavior', () => {
    const getErrorText = (error: ESQLMessage | EditorError): string =>
      'text' in error ? (error as ESQLMessage).text : (error as EditorError).message;

    it('preserves syntax errors regardless of missing callbacks', async () => {
      const { validate } = await setup();
      const { errors } = await validate('FROM index | WHERE field ==', {});
      expect(errors.length).toBeGreaterThan(0);
      const hasSyntaxError = errors.some((e) => {
        const text = getErrorText(e);
        return (
          text?.includes('mismatched input') || text?.includes('missing') || text?.includes('==')
        );
      });
      expect(hasSyntaxError).toBe(true);
    });

    it('filters semantic errors when required callback is missing', async () => {
      const { validate, callbacks } = await setup();
      const { errors } = await validate('FROM index | WHERE unknownField > 10', {
        ...callbacks,
        getColumnsFor: undefined,
      });
      expect(errors.some((e) => e.code === 'unknownColumn')).toBe(false);
    });

    it('shows semantic errors when required callback is available', async () => {
      const { validate, callbacks } = await setup();
      const { errors } = await validate('FROM index | WHERE unknownField > 10', callbacks);
      const unknownColumnError = errors.find((e) => e.code === 'unknownColumn');
      expect(unknownColumnError).toBeDefined();
      expect(getErrorText(unknownColumnError!)).toContain('unknownField');
    });

    it('handles mixed syntax and semantic errors correctly', async () => {
      const { validate, callbacks } = await setup();
      const { errors } = await validate('FROM unknown_index | LIMIT abc', {
        ...callbacks,
        getSources: undefined,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === 'unknownIndex' || e.code === 'unknownDataSource')).toBe(
        false
      );
    });

    it('filters errors based on specific callback requirements', async () => {
      const { validate, callbacks } = await setup();
      const { errors: errorsNoSources } = await validate(
        'FROM unknown_index | ENRICH unknown_policy',
        { ...callbacks, getSources: undefined }
      );
      expect(
        errorsNoSources.some((e) => e.code === 'unknownIndex' || e.code === 'unknownDataSource')
      ).toBe(false);
      expect(errorsNoSources.some((e) => e.code === 'unknownPolicy')).toBe(true);

      const { errors: errorsNoPolicies } = await validate(
        'FROM unknown_index | ENRICH unknown_policy',
        { ...callbacks, getPolicies: undefined }
      );
      expect(
        errorsNoPolicies.some((e) => e.code === 'unknownIndex' || e.code === 'unknownDataSource')
      ).toBe(true);
      expect(errorsNoPolicies.some((e) => e.code === 'unknownPolicy')).toBe(false);
    });

    it('does not flag Promql metrics/labels as unknown after a pipe', async () => {
      const { validate, callbacks } = await setup();
      const { errors } = await validate('Promql step="5m" sum(doubleField) | KEEP step', callbacks);
      expect(errors.some((e) => e.code === 'unknownColumn')).toBe(false);
    });
  });
};
