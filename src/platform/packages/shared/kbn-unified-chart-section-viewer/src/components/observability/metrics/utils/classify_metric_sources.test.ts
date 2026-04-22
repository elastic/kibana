/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart, MatchedItem } from '@kbn/data-views-plugin/public';
import type { UnclassifiedMetricItem } from '../../../../types';
import { classifyMetricSources } from './classify_metric_sources';

const createMockDataViews = (response?: MatchedItem[]): DataViewsPublicPluginStart =>
  ({
    getIndices: response
      ? jest.fn().mockResolvedValue(response)
      : jest.fn().mockRejectedValue(new Error('resolve failed')),
  } as unknown as DataViewsPublicPluginStart);

const createMetricItem = (
  overrides: Partial<UnclassifiedMetricItem> &
    Pick<UnclassifiedMetricItem, 'metricName' | 'dataStream'>
): UnclassifiedMetricItem => ({
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

describe('classifyMetricSources', () => {
  it('stamps fallbackKind when uniqueSources is empty and does not call getIndices', async () => {
    const dataViews = createMockDataViews([]);
    const items = [createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' })];

    const result = await classifyMetricSources(dataViews, items, new Set(), {
      fallbackKind: 'data_stream',
    });

    expect(result).toHaveLength(1);
    expect(result[0].sourceKind).toBe('data_stream');
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

    const result = await classifyMetricSources(
      dataViews,
      items,
      new Set(['metrics-system-default', 'plain-index']),
      { fallbackKind: 'data_stream' }
    );

    expect(dataViews.getIndices).toHaveBeenCalledWith({
      pattern: expect.stringContaining('metrics-system-default'),
      showAllIndices: true,
      isRollupIndex: expect.any(Function),
    });

    expect(result[0].sourceKind).toBe('data_stream');
    expect(result[1].sourceKind).toBe('index');
  });

  it("stamps fallbackKind='data_stream' on every item when getIndices throws", async () => {
    const dataViews = createMockDataViews();
    const items = [
      createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' }),
      createMetricItem({ metricName: 'disk', dataStream: 'plain-index' }),
    ];

    const result = await classifyMetricSources(
      dataViews,
      items,
      new Set(['metrics-system-default', 'plain-index']),
      { fallbackKind: 'data_stream' }
    );

    expect(result[0].sourceKind).toBe('data_stream');
    expect(result[1].sourceKind).toBe('data_stream');
  });

  it("stamps fallbackKind='index' on every item when getIndices throws", async () => {
    const dataViews = createMockDataViews();
    const items = [
      createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' }),
      createMetricItem({ metricName: 'disk', dataStream: 'plain-index' }),
    ];

    const result = await classifyMetricSources(
      dataViews,
      items,
      new Set(['metrics-system-default', 'plain-index']),
      { fallbackKind: 'index' }
    );

    expect(result[0].sourceKind).toBe('index');
    expect(result[1].sourceKind).toBe('index');
  });

  it("stamps fallbackKind='data_stream' on every item when getIndices resolves to an empty array", async () => {
    const dataViews = createMockDataViews([]);
    const items = [
      createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' }),
      createMetricItem({ metricName: 'disk', dataStream: 'plain-index' }),
    ];

    const result = await classifyMetricSources(
      dataViews,
      items,
      new Set(['metrics-system-default', 'plain-index']),
      { fallbackKind: 'data_stream' }
    );

    expect(result[0].sourceKind).toBe('data_stream');
    expect(result[1].sourceKind).toBe('data_stream');
  });

  it("stamps fallbackKind='index' on every item when getIndices resolves to an empty array", async () => {
    const dataViews = createMockDataViews([]);
    const items = [
      createMetricItem({ metricName: 'cpu', dataStream: 'metrics-system-default' }),
      createMetricItem({ metricName: 'disk', dataStream: 'plain-index' }),
    ];

    const result = await classifyMetricSources(
      dataViews,
      items,
      new Set(['metrics-system-default', 'plain-index']),
      { fallbackKind: 'index' }
    );

    expect(result[0].sourceKind).toBe('index');
    expect(result[1].sourceKind).toBe('index');
  });
});
