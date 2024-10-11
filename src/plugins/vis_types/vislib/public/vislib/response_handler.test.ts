/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setFormatService } from '../services';

jest.mock('./helpers', () => ({
  buildPointSeriesData: jest.fn(() => ({})),
}));

// @ts-ignore
import { vislibSeriesResponseHandler } from './response_handler';
import { buildPointSeriesData } from './helpers';

describe('response_handler', () => {
  describe('vislibSeriesResponseHandler', () => {
    beforeAll(() => {
      setFormatService({
        deserialize: () => ({
          convert: jest.fn((v) => v),
        }),
      } as any);
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
