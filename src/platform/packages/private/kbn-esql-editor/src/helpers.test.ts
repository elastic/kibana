/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterDataErrors, filterOverlappingWarnings, parseErrors, parseWarning } from './helpers';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';

describe('helpers', function () {
  describe('parseErrors', function () {
    it('should return the correct error object from ESQL ES response for an one liner query', function () {
      const error = new Error(
        '[essql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem\nline 1:8: Unknown column [miaou]'
      );
      const errors = [error];
      expect(parseErrors(errors, 'SELECT miaou from test')).toEqual([
        {
          endColumn: 14,
          endLineNumber: 1,
          message: ' Unknown column [miaou]',
          severity: 8,
          startColumn: 8,
          startLineNumber: 1,
          code: 'errorFromES',
        },
      ]);
    });

    it('should return the correct error object from ESQL ES response for an multi liner query', function () {
      const error = new Error(
        '[essql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem line 3:7: Condition expression needs to be boolean, found [TEXT]'
      );
      const errors = [error];
      expect(
        parseErrors(
          errors,
          `SELECT * 
      FROM "kibana_sample_data_ecommerce" 
      WHERE category`
        )
      ).toEqual([
        {
          endColumn: 12,
          endLineNumber: 3,
          message: ' Condition expression needs to be boolean, found [TEXT]',
          severity: 8,
          startColumn: 7,
          startLineNumber: 3,
          code: 'errorFromES',
        },
      ]);
    });

    it('should return the generic error object for an error of unknown format', function () {
      const error = new Error('I am an unknown error');
      const errors = [error];
      expect(parseErrors(errors, `FROM "kibana_sample_data_ecommerce"`)).toEqual([
        {
          endColumn: 10,
          endLineNumber: 1,
          message: 'I am an unknown error',
          severity: 8,
          startColumn: 1,
          startLineNumber: 1,
          code: 'unknownError',
        },
      ]);
    });

    it('should return the generic error object for an error with unexpected format', function () {
      const error = new Error(
        '[esql] > Unexpected error from Elasticsearch: verification_exception - Found ambiguous reference to [user_id]; matches any of [line 3:15 [user_id], line 4:15 [user_id]]'
      );
      const errors = [error];
      expect(parseErrors(errors, `FROM "kibana_sample_data_ecommerce"`)).toEqual([
        {
          endColumn: 10,
          endLineNumber: 1,
          message: error.message,
          severity: 8,
          startColumn: 1,
          startLineNumber: 1,
          code: 'unknownError',
        },
      ]);
    });
  });

  describe('parseWarning', function () {
    it('should return the correct warning object from ESQL ES response for an one liner query', function () {
      const warning =
        '299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:52: evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded."';
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 138,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 52,
          startLineNumber: 1,
          code: 'warningFromES',
        },
      ]);
    });

    it('should return the correct array of warnings if multiple warnings are detected', function () {
      const warning =
        '299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:52: evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:84: evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded."';
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 138,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 52,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 169,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 84,
          startLineNumber: 1,
          code: 'warningFromES',
        },
      ]);
    });

    it('should return the correct array of warnings if the message contains additional info', function () {
      const warning =
        '299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:52: evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:84: java.lang.IllegalArgumentException: evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded."';
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 138,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 52,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 169,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 84,
          startLineNumber: 1,
          code: 'warningFromES',
        },
      ]);
    });

    it('should return the correct array of warnings if multiple warnins are detected without line indicators', function () {
      const warning =
        '299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Field [geo.coordinates] cannot be retrieved, it is unsupported or not indexed; returning null.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Field [ip_range] cannot be retrieved, it is unsupported or not indexed; returning null.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Field [timestamp_range] cannot be retrieved, it is unsupported or not indexed; returning null."';
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [geo.coordinates] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [ip_range] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [timestamp_range] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
          code: 'warningFromES',
        },
      ]);
    });
    it('should return the correct array of warnings if multiple warnins of different types', function () {
      const warning =
        '299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Field [geo.coordinates] cannot be retrieved, it is unsupported or not indexed; returning null.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Field [ip_range] cannot be retrieved, it is unsupported or not indexed; returning null.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:52: evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded."';
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [geo.coordinates] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [ip_range] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 138,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 52,
          startLineNumber: 1,
          code: 'warningFromES',
        },
      ]);
    });

    it('should return the correct array of warningsif the quotes are escaped (at that case we dont have a new warning)', function () {
      const warning = `299 Elasticsearch-9.1.0 "No limit defined, adding default limit of [1000]", "Line 1:9: evaluation of [TO_LOWER([\\"FOO\\", \\"BAR\\"])] failed", "Line 1:9: java.lang.IllegalArgumentException: single-value function encountered multi-value"`;
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 10,
          endLineNumber: 1,
          message: 'No limit defined, adding default limit of [1000]',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 40,
          endLineNumber: 1,
          message: 'evaluation of [TO_LOWER(["FOO", "BAR"])] failed',
          severity: 4,
          startColumn: 9,
          startLineNumber: 1,
          code: 'warningFromES',
        },
        {
          endColumn: 18,
          endLineNumber: 1,
          message: 'single-value function encountered multi-value',
          severity: 4,
          startColumn: 9,
          startLineNumber: 1,
          code: 'warningFromES',
        },
      ]);
    });
  });

  describe('filterDataErrors', function () {
    it('should return an empty array if no errors are provided', function () {
      expect(filterDataErrors([])).toEqual([]);
    });

    it('should filter properly filter data errors', function () {
      const errors = [
        { code: 'unknownIndex' },
        { code: 'unknownColumn' },
        { code: 'other' },
      ] as MonacoMessage[];

      expect(filterDataErrors(errors)).toEqual([{ code: 'other' }]);
    });
  });

  describe('filterOverlappingWarnings', function () {
    it.each([
      {
        description: 'should filter out warning exactly matching error range',
        errorRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 10 },
        warningRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 10 },
        expectedWarningCount: 0,
      },
      {
        description: 'should filter out warning inside error range',
        errorRange: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 20 },
        warningRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 10 },
        expectedWarningCount: 0,
      },
      {
        description: 'should filter out warning ending inside error range',
        errorRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 15 },
        warningRange: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6 },
        expectedWarningCount: 0,
      },
      {
        description: 'should filter out warning starting inside error range',
        errorRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 15 },
        warningRange: { startLineNumber: 1, startColumn: 14, endLineNumber: 1, endColumn: 20 },
        expectedWarningCount: 0,
      },
      {
        description: 'should filter out warning that contains an error',
        errorRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 10 },
        warningRange: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 15 },
        expectedWarningCount: 0,
      },
      {
        description: 'should NOT filter out warning on different line',
        errorRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 10 },
        warningRange: { startLineNumber: 2, startColumn: 5, endLineNumber: 2, endColumn: 10 },
        expectedWarningCount: 1,
      },
      {
        description: 'should NOT filter out warning strictly before error on same line',
        errorRange: { startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 20 },
        warningRange: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 },
        expectedWarningCount: 1,
      },
      {
        description: 'should NOT filter out warning strictly after error on same line',
        errorRange: { startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 20 },
        warningRange: { startLineNumber: 1, startColumn: 25, endLineNumber: 1, endColumn: 30 },
        expectedWarningCount: 1,
      },
    ])('$description', ({ errorRange, warningRange, expectedWarningCount }) => {
      const errors = [
        {
          message: 'Error',
          severity: 1,
          code: 'error',
          ...errorRange,
        },
      ];
      const warnings = [
        {
          message: 'Warning',
          severity: 1,
          code: 'warning',
          ...warningRange,
        },
      ];

      expect(filterOverlappingWarnings(errors, warnings)).toHaveLength(expectedWarningCount);
    });
  });
});
