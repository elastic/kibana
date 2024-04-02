/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Histogram } from './histogram';
import React from 'react';
import { of } from 'rxjs';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { createDefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { UnifiedHistogramFetchStatus, UnifiedHistogramInput$ } from '../types';
import { getLensAttributes } from './utils/get_lens_attributes';
import { act } from 'react-dom/test-utils';
import * as buildBucketInterval from './utils/build_bucket_interval';
import * as useTimeRange from './hooks/use_time_range';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { Subject } from 'rxjs';
import { getLensProps } from './hooks/use_lens_props';

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
    suggestion: undefined,
  });

function mountComponent(isPlainRecord = false, hasLensSuggestions = false) {
  const services = unifiedHistogramServicesMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const timefilterUpdateHandler = jest.fn();
  const refetch$: UnifiedHistogramInput$ = new Subject();
  const props = {
    services: unifiedHistogramServicesMock,
    request: {
      searchSessionId: '123',
    },
    hasLensSuggestions,
    isPlainRecord,
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
    getTimeRange: () => ({
      from: '2020-05-14T11:05:13.590',
      to: '2020-05-14T11:20:13.590',
    }),
    refetch$,
    lensAttributesContext: getMockLensAttributes(),
    onTotalHitsChange: jest.fn(),
    onChartLoad: jest.fn(),
    withDefaultActions: undefined,
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

  it('should only update lens.EmbeddableComponent props when refetch$ is triggered', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    expect(component.find(embeddable).exists()).toBe(true);
    let lensProps = component.find(embeddable).props();
    const originalProps = getLensProps({
      searchSessionId: props.request.searchSessionId,
      getTimeRange: props.getTimeRange,
      attributes: getMockLensAttributes().attributes,
      onLoad: lensProps.onLoad,
    });
    expect(lensProps).toMatchObject(expect.objectContaining(originalProps));
    component.setProps({ request: { ...props.request, searchSessionId: '321' } }).update();
    lensProps = component.find(embeddable).props();
    expect(lensProps).toMatchObject(expect.objectContaining(originalProps));
    await act(async () => {
      props.refetch$.next({ type: 'refetch' });
    });
    component.update();
    lensProps = component.find(embeddable).props();
    expect(lensProps).toMatchObject(
      expect.objectContaining({ ...originalProps, searchSessionId: '321' })
    );
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
    const embeddableOutput$ = jest.fn().mockReturnValue(of('output$'));
    onLoad(true, undefined, embeddableOutput$);
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.loading,
      undefined
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ adapters: {}, embeddableOutput$ });
    expect(buildBucketInterval.buildBucketInterval).not.toHaveBeenCalled();
    expect(useTimeRange.useTimeRange).toHaveBeenLastCalledWith(
      expect.objectContaining({ bucketInterval: undefined })
    );
    act(() => {
      onLoad(false, adapters, embeddableOutput$);
    });
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.complete,
      100
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ adapters, embeddableOutput$ });
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
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ adapters });
  });

  it('should execute onLoad correctly when the response has shard failures', async () => {
    const { component, props } = mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    const adapters = createDefaultInspectorAdapters();
    adapters.tables.tables.unifiedHistogram = { meta: { statistics: { totalCount: 100 } } } as any;
    const rawResponse = {
      _shards: {
        total: 1,
        successful: 0,
        skipped: 0,
        failed: 1,
        failures: [],
      },
      hits: {
        total: 100,
        max_score: null,
        hits: [],
      },
    };
    jest
      .spyOn(adapters.requests, 'getRequests')
      .mockReturnValue([{ response: { json: { rawResponse } } } as any]);
    act(() => {
      onLoad(false, adapters);
    });
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.complete,
      100
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ adapters });
  });

  it('should execute onLoad correctly for textbased language and no Lens suggestions', async () => {
    const { component, props } = mountComponent(true, false);
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    const adapters = createDefaultInspectorAdapters();
    adapters.tables.tables.layerId = {
      meta: { type: 'es_ql' },
      columns: [
        {
          id: 'results',
          name: 'results',
          meta: {
            type: 'number',
            dimensionName: 'Vertical axis',
          },
        },
      ],
      rows: [
        {
          results: 16,
        },
        {
          results: 4,
        },
      ],
    } as any;
    act(() => {
      onLoad(false, adapters);
    });
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.complete,
      20
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ adapters });
  });

  it('should execute onLoad correctly for textbased language and Lens suggestions', async () => {
    const { component, props } = mountComponent(true, true);
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad;
    const adapters = createDefaultInspectorAdapters();
    adapters.tables.tables.layerId = {
      meta: { type: 'es_ql' },
      columns: [
        {
          id: 'rows',
          name: 'rows',
          meta: {
            type: 'number',
            dimensionName: 'Vertical axis',
          },
        },
      ],
      rows: [
        {
          var0: 5584.925311203319,
        },
        {
          var0: 6788.7777444444,
        },
      ],
    } as any;
    act(() => {
      onLoad(false, adapters);
    });
    expect(props.onTotalHitsChange).toHaveBeenLastCalledWith(
      UnifiedHistogramFetchStatus.complete,
      2
    );
    expect(props.onChartLoad).toHaveBeenLastCalledWith({ adapters });
  });
});
