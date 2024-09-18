/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { parseErrors, parseWarning, getIndicesList, getRemoteIndicesList } from './helpers';

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
          severity: 4,
          startColumn: 52,
          startLineNumber: 1,
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
        },
        {
          endColumn: 169,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 84,
          startLineNumber: 1,
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
        },
        {
          endColumn: 169,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.src)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 84,
          startLineNumber: 1,
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
        },
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [ip_range] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
        },
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [timestamp_range] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
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
        },
        {
          endColumn: 10,
          endLineNumber: 1,
          message:
            'Field [ip_range] cannot be retrieved, it is unsupported or not indexed; returning null.',
          severity: 4,
          startColumn: 1,
          startLineNumber: 1,
        },
        {
          endColumn: 138,
          endLineNumber: 1,
          message:
            'evaluation of [date_parse(geo.dest)] failed, treating result as null. Only first 20 failures recorded.',
          severity: 4,
          startColumn: 52,
          startLineNumber: 1,
        },
      ]);
    });
  });

  describe('getIndicesList', function () {
    it('should return also system indices with hidden flag on', async function () {
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const updatedDataViewsMock = {
        ...dataViewsMock,
        getIndices: jest.fn().mockResolvedValue([
          {
            name: '.system1',
            title: 'system1',
          },
          {
            name: 'logs',
            title: 'logs',
          },
        ]),
      };
      const indices = await getIndicesList(updatedDataViewsMock);
      expect(indices).toStrictEqual([
        { name: '.system1', hidden: true, type: 'Index' },
        { name: 'logs', hidden: false, type: 'Index' },
      ]);
    });

    it('should type correctly the aliases', async function () {
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const updatedDataViewsMock = {
        ...dataViewsMock,
        getIndices: jest.fn().mockResolvedValue([
          {
            name: 'alias1',
            title: 'system1',
            tags: [
              {
                name: 'Alias',
                type: 'alias',
              },
            ],
          },
          {
            name: 'logs',
            title: 'logs',
          },
        ]),
      };
      const indices = await getIndicesList(updatedDataViewsMock);
      expect(indices).toStrictEqual([
        { name: 'alias1', hidden: false, type: 'Alias' },
        { name: 'logs', hidden: false, type: 'Index' },
      ]);
    });
  });

  describe('getRemoteIndicesList', function () {
    it('should filter out aliases and hidden indices', async function () {
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const updatedDataViewsMock = {
        ...dataViewsMock,
        getIndices: jest.fn().mockResolvedValue([
          {
            name: 'remote: alias1',
            item: {
              indices: ['index1'],
            },
          },
          {
            name: 'remote:.system1',
            item: {
              name: 'system',
            },
          },
          {
            name: 'remote:logs',
            item: {
              name: 'logs',
              timestamp_field: '@timestamp',
            },
          },
        ]),
      };
      const indices = await getRemoteIndicesList(updatedDataViewsMock);
      expect(indices).toStrictEqual([{ name: 'remote:logs', hidden: false, type: 'Index' }]);
    });
  });
});
