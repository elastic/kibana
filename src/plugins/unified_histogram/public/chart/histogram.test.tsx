/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getLensProps, Histogram } from './histogram';
import React from 'react';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { createDefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { UnifiedHistogramFetchStatus } from '../types';
import { getLensAttributes } from './get_lens_attributes';
import { REQUEST_DEBOUNCE_MS } from './consts';
import { act } from 'react-dom/test-utils';
import * as buildBucketInterval from './build_bucket_interval';
import * as useTimeRange from './use_time_range';
import { RequestStatus } from '@kbn/inspector-plugin/public';

const mockBucketInterval = { description: '1 minute', scale: undefined, scaled: false };
jest.spyOn(buildBucketInterval, 'buildBucketInterval').mockReturnValue(mockBucketInterval);
jest.spyOn(useTimeRange, 'useTimeRange');

const getMockLensAttributes = () =>
  getLensAttributes({
    title: 'test',
    filters: [],
    query: {
      language: 'kuery',
      query: '',
    },
    dataView: dataViewWithTimefieldMock,
    timeInterval: 'auto',
    breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
  });

function mountComponent() {
  const services = unifiedHistogramServicesMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const timefilterUpdateHandler = jest.fn();

  const props = {
    services: unifiedHistogramServicesMock,
    request: {
      searchSessionId: '123',
    },
    hits: {
      status: UnifiedHistogramFetchStatus.loading,
      total: undefined,
    },
    chart: {
      hidden: false,
      timeInterval: 'auto',
    },
    timefilterUpdateHandler,
    dataView: dataViewWithTimefieldMock,
    timeRange: {
      from: '2020-05-14T11:05:13.590',
      to: '2020-05-14T11:20:13.590',
    },
    lastReloadRequestTime: 42,
    lensAttributes: getMockLensAttributes(),
    onTotalHitsChange: jest.fn(),
    onChartLoad: jest.fn(),
  };

  return {
    props,
    component: mountWithIntl(<Histogram {...props} />),
  };
}

describe('Histogram', () => {
  it('renders correctly', () => {
    const { component } = mountComponent();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBe(true);
  });

  it('should render lens.EmbeddableComponent with debounced props', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    expect(component.find(embeddable).exists()).toBe(true);
    let lensProps = component.find(embeddable).props();
    const originalProps = getLensProps({
      timeRange: props.timeRange,
      attributes: getMockLensAttributes(),
      request: props.request,
      lastReloadRequestTime: props.lastReloadRequestTime,
      onLoad: lensProps.onLoad,
    });
    expect(lensProps).toEqual(originalProps);
    component.setProps({ lastReloadRequestTime: 43 }).update();
    lensProps = component.find(embeddable).props();
    expect(lensProps).toEqual(originalProps);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DEBOUNCE_MS));
    });
    component.update();
    lensProps = component.find(embeddable).props();
    expect(lensProps).toEqual({ ...originalProps, lastReloadRequestTime: 43 });
  });

  it('should execute onLoad correctly', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    const adapters = createDefaultInspectorAdapters();
    adapters.tables.tables.unifiedHistogram = { meta: { statistics: { totalCount: 100 } } } as any;
    const rawResponse = {
      took: 0,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: 100,
        max_score: null,
        hits: [],
      },
      aggregations: {
        '2': {
          buckets: [
            {
              key_as_string: '2022-10-05T16:00:00.000-03:00',
              key: 1664996400000,
              doc_count: 20,
            },
            {
              key_as_string: '2022-10-05T16:30:00.000-03:00',
              key: 1664998200000,
              doc_count: 20,
            },
            {
              key_as_string: '2022-10-05T17:00:00.000-03:00',
              key: 1665000000000,
              doc_count: 20,
            },
            {
              key_as_string: '2022-10-05T17:30:00.000-03:00',
              key: 1665001800000,
              doc_count: 20,
            },
            {
              key_as_string: '2022-10-05T18:00:00.000-03:00',
              key: 1665003600000,
              doc_count: 20,
            },
          ],
        },
      },
    };
    jest
      .spyOn(adapters.requests, 'getRequests')
      .mockReturnValue([{ response: { json: { rawResponse } } } as any]);
    onLoad(true, undefined);
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.loading,
      undefined
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ complete: false, adapters: {} });
    expect(buildBucketInterval.buildBucketInterval).not.toHaveBeenCalled();
    expect(useTimeRange.useTimeRange).toHaveBeenLastCalledWith(
      expect.objectContaining({ bucketInterval: undefined })
    );
    act(() => {
      onLoad(false, adapters);
    });
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.complete,
      100
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ complete: true, adapters });
    expect(buildBucketInterval.buildBucketInterval).toHaveBeenCalled();
    expect(useTimeRange.useTimeRange).toHaveBeenLastCalledWith(
      expect.objectContaining({ bucketInterval: mockBucketInterval })
    );
  });

  it('should execute onLoad correctly when the request has a failure status', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    const adapters = createDefaultInspectorAdapters();
    jest
      .spyOn(adapters.requests, 'getRequests')
      .mockReturnValue([{ status: RequestStatus.ERROR } as any]);
    onLoad(false, adapters);
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.error,
      undefined
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ complete: false, adapters });
  });

  it('should execute onLoad correctly when the response has shard failures', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    const adapters = createDefaultInspectorAdapters();
    const rawResponse = {
      _shards: {
        total: 1,
        successful: 0,
        skipped: 0,
        failed: 1,
        failures: [],
      },
    };
    jest
      .spyOn(adapters.requests, 'getRequests')
      .mockReturnValue([{ response: { json: { rawResponse } } } as any]);
    onLoad(false, adapters);
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.error,
      undefined
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ complete: false, adapters });
  });

  it('should not recreate onLoad in debounced lens props when hits.total changes', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    onLoad(true, undefined);
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.loading,
      undefined
    );
    component
      .setProps({
        hits: {
          status: UnifiedHistogramFetchStatus.complete,
          total: 100,
        },
      })
      .update();
    expect(component.find(embeddable).props().onLoad).toBe(onLoad);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DEBOUNCE_MS));
    });
    component.update();
    expect(component.find(embeddable).props().onLoad).toBe(onLoad);
    onLoad(true, undefined);
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.loading,
      100
    );
  });
});
