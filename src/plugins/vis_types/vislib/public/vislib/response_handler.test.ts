/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setFormatService } from '../services';

jest.mock('./helpers', () => ({
  buildPointSeriesData: jest.fn(() => ({})),
}));

// @ts-ignore
import { vislibSeriesResponseHandler } from './response_handler';
import { buildPointSeriesData } from './helpers';
import { Table } from './types';

describe('response_handler', () => {
  describe('vislibSeriesResponseHandler', () => {
    let resp: Table;
    let expected: any;

    beforeAll(() => {
      setFormatService({
        deserialize: () => ({
          convert: jest.fn((v) => v),
        }),
      } as any);
    });

    beforeAll(() => {
      resp = {
        rows: [
          { 'col-0-3': 158599872, 'col-1-1': 1 },
          { 'col-0-3': 158599893, 'col-1-1': 2 },
          { 'col-0-3': 158599908, 'col-1-1': 1 },
        ],
        columns: [
          { id: 'col-0-3', name: 'timestamp per 30 seconds' },
          { id: 'col-1-1', name: 'Count' },
        ],
      } as Table;

      const colId = resp.columns[0].id;
      expected = [
        { label: `${resp.rows[0][colId]}: ${resp.columns[0].name}` },
        { label: `${resp.rows[1][colId]}: ${resp.columns[0].name}` },
        { label: `${resp.rows[2][colId]}: ${resp.columns[0].name}` },
      ];
    });

    test('should not call buildPointSeriesData when no columns', () => {
      vislibSeriesResponseHandler({ rows: [] }, {});
      expect(buildPointSeriesData).not.toHaveBeenCalled();
    });

    test('should call buildPointSeriesData', () => {
      const response = {
        rows: [{ 'col-0-1': 1 }],
        columns: [{ id: 'col-0-1', name: 'Count' }],
      };
      const dimensions = { x: null, y: { accessor: 0 } };
      vislibSeriesResponseHandler(response, dimensions);

      expect(buildPointSeriesData).toHaveBeenCalledWith(
        { columns: [...response.columns], rows: [...response.rows] },
        dimensions
      );
    });
  });
});
