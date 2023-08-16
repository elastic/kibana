/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseErrors, parseWarning, getInlineEditorText } from './helpers';

describe('helpers', function () {
  describe('parseErrors', function () {
    it('should return the correct error object from ESQL ES response for an one liner query', function () {
      const error = new Error(
        '[essql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem\nline 1:8: Unknown column [miaou]'
      );
      const errors = [error];
      expect(parseErrors(errors, 'SELECT miaou from test')).toEqual([
        {
          endColumn: 13,
          endLineNumber: 1,
          message: ' Unknown column [miaou]',
          severity: 8,
          startColumn: 8,
          startLineNumber: 1,
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
          endColumn: 11,
          endLineNumber: 3,
          message: ' Condition expression needs to be boolean, found [TEXT]',
          severity: 8,
          startColumn: 7,
          startLineNumber: 3,
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
          severity: 8,
          startColumn: 52,
          startLineNumber: 1,
        },
      ]);
    });

    it('should return the correct array of warnings if multiple warnins are detected', function () {
      const warning =
        '299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:52: evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.", 299 Elasticsearch-8.10.0-SNAPSHOT-adb9fce96079b421c2575f0d2d445f492eb5f075 "Line 1:84: evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded."';
      expect(parseWarning(warning)).toEqual([
        {
          endColumn: 138,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 8,
          startColumn: 52,
          startLineNumber: 1,
        },
        {
          endColumn: 169,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 8,
          startColumn: 84,
          startLineNumber: 1,
        },
      ]);
    });
  });

  describe('getInlineEditorText', function () {
    it('should return the entire query if it is one liner', function () {
      const text = getInlineEditorText('FROM index1 | keep field1, field2 | order field1', false);
      expect(text).toEqual(text);
    });

    it('should return the query on one line with extra space if is multiliner', function () {
      const text = getInlineEditorText(
        'FROM index1 | keep field1, field2\n| keep field1, field2 | order field1',
        true
      );
      expect(text).toEqual(
        'FROM index1 | keep field1, field2 | keep field1, field2 | order field1'
      );
    });

    it('should return the query on one line with extra spaces removed if is multiliner', function () {
      const text = getInlineEditorText(
        'FROM index1 | keep field1, field2\n| keep field1, field2 \n  | order field1',
        true
      );
      expect(text).toEqual(
        'FROM index1 | keep field1, field2 | keep field1, field2 | order field1'
      );
    });
  });
});
