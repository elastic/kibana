/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getPercentileValue } from './percentiles_get_value';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';

describe('getPercentileValue', () => {
  test('should return the correct value for an IResponseAggConfig', () => {
    const agg = {
      id: '0.400',
      key: 400,
      parentId: '0',
    } as IResponseAggConfig;
    const bucket = {
      '0': {
        values: [
          {
            key: 400,
            value: 24.21909648206358,
          },
        ],
      },
      doc_count: 2356,
    };
    const value = getPercentileValue(agg, bucket);
    expect(value).toEqual(24.21909648206358);
  });
});
