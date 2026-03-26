/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart, MatchedItem } from '@kbn/data-views-plugin/public';
import type { ParsedMetricItem } from '../../../../types';
import { enrichWithDataStreamInfo } from './enrich_with_data_stream_info';

const createMockDataViews = (response?: MatchedItem[]): DataViewsPublicPluginStart =>
  ({
    getIndices: response
      ? jest.fn().mockResolvedValue(response)
      : jest.fn().mockRejectedValue(new Error('resolve failed')),
  } as unknown as DataViewsPublicPluginStart);

const createMetricItem = (
  overrides: Partial<ParsedMetricItem> & Pick<ParsedMetricItem, 'metricName' | 'dataStream'>
): ParsedMetricItem => ({
  isDataStream: true,
  units: [],
  metricTypes: [],
  fieldTypes: [],
  dimensionFields: [],
  ...overrides,
});

const createMatchedItem = (name: string, isDataStream: boolean): MatchedItem =>
  ({
    name,
    tags: isDataStream ? [{ key: 'data_stream', name: 'Data stream', color: '' }] : [],
    item: { name },
  } as MatchedItem);

describe('enrichWithDataStreamInfo', () => {
  it('returns items unchanged when uniqueNames is empty', async () => {
    const dataViews = createMockDataViews([]);
    const items = [createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' })];

    const result = await enrichWithDataStreamInfo(dataViews, items, new Set());

    expect(result).toBe(items);
    expect(dataViews.getIndices).not.toHaveBeenCalled();
  });

  it('marks items as data streams when resolved with data_stream tag', async () => {
    const dataViews = createMockDataViews([
      createMatchedItem('metrics-system-default', true),
      createMatchedItem('plain-index', false),
    ]);

    const items = [
      createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' }),
      createMetricItem({ metricName: 'disk', dataStream: 'plain-index' }),
    ];

    const result = await enrichWithDataStreamInfo(
      dataViews,
      items,
      new Set(['metrics-system-default', 'plain-index'])
    );

    expect(dataViews.getIndices).toHaveBeenCalledWith({
      pattern: expect.stringContaining('metrics-system-default'),
      showAllIndices: true,
      isRollupIndex: expect.any(Function),
    });

    expect(result[0].isDataStream).toBe(true);
    expect(result[1].isDataStream).toBe(false);
  });

  it('returns items unchanged when getIndices throws', async () => {
    const dataViews = createMockDataViews();
    const items = [createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' })];

    const result = await enrichWithDataStreamInfo(
      dataViews,
      items,
      new Set(['metrics-system-default'])
    );

    expect(result).toBe(items);
  });
});
