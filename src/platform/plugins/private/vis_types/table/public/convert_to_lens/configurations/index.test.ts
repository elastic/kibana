/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggTypes } from '../../../common';
import { getConfiguration } from '.';
import { CollapseFunction } from '@kbn/visualizations-plugin/common';

const params = {
  perPage: 20,
  percentageCol: 'Count',
  showLabel: false,
  showMetricsAtAllLevels: true,
  showPartialRows: true,
  showTotal: true,
  showToolbar: false,
  totalFunc: AggTypes.SUM,
};

describe('getConfiguration', () => {
  test('should return correct configuration', () => {
    expect(
      getConfiguration('test1', params, {
        metrics: ['metric-1'],
        buckets: { all: ['bucket-1'], customBuckets: { 'metric-1': 'bucket-1' } },
        columnsWithoutReferenced: [
          {
            columnId: 'metric-1',
            operationType: 'count',
            isBucketed: false,
            isSplit: false,
            sourceField: 'document',
            params: {},
            dataType: 'number',
          },
          {
            columnId: 'bucket-1',
            operationType: 'date_histogram',
            isBucketed: true,
            isSplit: false,
            sourceField: 'date-field',
            dataType: 'date',
            params: {
              interval: '1h',
            },
          },
        ],
        bucketCollapseFn: { sum: ['bucket-1'] } as Record<CollapseFunction, string[]>,
      })
    ).toEqual({
      columns: [
        {
          alignment: 'left',
          columnId: 'metric-1',
          summaryRow: 'sum',
        },
        {
          alignment: 'left',
          collapseFn: 'sum',
          columnId: 'bucket-1',
        },
      ],
      headerRowHeight: 'custom',
      rowHeight: 'custom',
      layerId: 'test1',
      layerType: 'data',
      paging: {
        enabled: true,
        size: 20,
      },
    });
  });
});
