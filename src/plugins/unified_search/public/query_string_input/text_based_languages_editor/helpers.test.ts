/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseErrors } from './helpers';

describe('helpers', function () {
  describe('parseErrors', function () {
    it('should return the correct error object from SQL ES response for an one liner query', function () {
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

    it('should return the correct error object from SQL ES response for an multi liner query', function () {
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

    it('should return the correct error object if dataview not found for an one liner query', function () {
      const error = new Error('No data view found for index pattern kibana_sample_data_ecommerce1');
      const errors = [error];
      expect(parseErrors(errors, `SELECT * FROM "kibana_sample_data_ecommerce1"`)).toEqual([
        {
          endColumn: 44,
          endLineNumber: 1,
          message: 'No data view found for index pattern kibana_sample_data_ecommerce1',
          severity: 8,
          startColumn: 10,
          startLineNumber: 1,
        },
      ]);
    });

    it('should return the correct error object if dataview not found for a multiline query', function () {
      const error = new Error('No data view found for index pattern kibana_sample_data_ecommerce1');
      const errors = [error];
      expect(
        parseErrors(
          errors,
          `SELECT * 
    from "kibana_sample_data_ecommerce1"`
        )
      ).toEqual([
        {
          endColumn: 39,
          endLineNumber: 2,
          message: 'No data view found for index pattern kibana_sample_data_ecommerce1',
          severity: 8,
          startColumn: 5,
          startLineNumber: 2,
        },
      ]);
    });

    it('should return the generic error object for an error of unknown format', function () {
      const error = new Error('I am an unknown error');
      const errors = [error];
      expect(parseErrors(errors, `SELECT * FROM "kibana_sample_data_ecommerce"`)).toEqual([
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
});
