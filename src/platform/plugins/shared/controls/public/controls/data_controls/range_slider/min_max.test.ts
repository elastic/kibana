/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { dataService, dataViewsService } from '../../../services/kibana_services';
import { getMinMax } from './min_max';

describe('getMinMax', () => {
  const field: FilterableField = { name: 'bytes', type: 'number', aggregatable: true };
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'dataset-id',
    title: 'logs-*',
    fields: [field],
    getFieldByName: () => field,
    timeFieldName: '@timestamp',
    isTimeBased: () => true,
  };
  const abortSignal = new AbortController().signal;

  beforeEach(() => {
    dataService.search.esql = jest.fn();
    dataViewsService.get = jest.fn();
  });

  it('asks the FROM target of an ES|QL source, with no data view', async () => {
    (dataService.search.esql as jest.Mock).mockResolvedValue({
      rawResponse: { values: [[3, 90]] },
    });

    const result = await getMinMax({
      abortSignal,
      dataSource: esqlSource,
      field,
      projectRouting: '_alias:*',
      timeRange: { from: 'now-1h', to: 'now' },
    });

    expect(result).toEqual({ min: 3, max: 90 });
    expect(dataService.search.esql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-* | STATS min = MIN(bytes), max = MAX(bytes)',
        projectRouting: '_alias:*',
        kibanaQueryContext: expect.objectContaining({
          timeRange: { from: 'now-1h', to: 'now' },
          timeField: '@timestamp',
        }),
      }),
      expect.anything()
    );
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('has no bounds when the target has no values in the field', async () => {
    (dataService.search.esql as jest.Mock).mockResolvedValue({
      rawResponse: { values: [[null, null]] },
    });

    expect(await getMinMax({ abortSignal, dataSource: esqlSource, field })).toEqual({
      min: undefined,
      max: undefined,
    });
  });
});
