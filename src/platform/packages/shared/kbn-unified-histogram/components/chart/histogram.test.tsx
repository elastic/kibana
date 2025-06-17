/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Histogram, HistogramProps } from './histogram';
import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { getLensVisMock } from '../../__mocks__/lens_vis';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { createDefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { UnifiedHistogramInput$ } from '../../types';
import { act } from 'react-dom/test-utils';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { getLensProps, useLensProps } from './hooks/use_lens_props';

const getMockLensAttributes = async () => {
  const query = {
    language: 'kuery',
    query: '',
  };
  return (
    await getLensVisMock({
      filters: [],
      query,
      columns: [],
      isPlainRecord: false,
      dataView: dataViewWithTimefieldMock,
      timeInterval: 'auto',
      breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
    })
  ).visContext;
};

type CombinedProps = Omit<HistogramProps, 'requestData' | 'lensProps'> &
  Parameters<typeof useLensProps>[0];

async function mountComponent(isPlainRecord = false, hasLensSuggestions = false) {
  const services = unifiedHistogramServicesMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const fetch$: UnifiedHistogramInput$ = new Subject();
  const props: CombinedProps = {
    services: unifiedHistogramServicesMock,
    request: {
      searchSessionId: '123',
    },
    isPlainRecord,
    chart: {
      hidden: false,
      timeInterval: 'auto',
    },
    dataView: dataViewWithTimefieldMock,
    getTimeRange: () => ({
      from: '2020-05-14T11:05:13.590',
      to: '2020-05-14T11:20:13.590',
    }),
    fetch$,
    visContext: (await getMockLensAttributes())!,
    onLoad: jest.fn(),
    withDefaultActions: undefined,
  };
  const Wrapper = (wrapperProps: CombinedProps) => {
    const lensPropsContext = useLensProps(wrapperProps);
    return lensPropsContext ? <Histogram {...wrapperProps} {...lensPropsContext} /> : null;
  };

  const component = mountWithIntl(<Wrapper {...props} />);

  act(() => {
    fetch$?.next({ type: 'fetch' });
  });

  return { props, fetch$, component: component.update() };
}

describe('Histogram', () => {
  it('renders correctly', async () => {
    const { component } = await mountComponent();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBe(true);
  });

  it('should only update lens.EmbeddableComponent props when fetch$ is triggered', async () => {
    const { component, props, fetch$ } = await mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    expect(component.find(embeddable).exists()).toBe(true);
    let lensProps = component.find(embeddable).props();
    const originalProps = getLensProps({
      searchSessionId: props.request?.searchSessionId,
      getTimeRange: props.getTimeRange,
      attributes: (await getMockLensAttributes())!.attributes,
      onLoad: lensProps.onLoad!,
    });
    expect(lensProps).toMatchObject(expect.objectContaining(originalProps));
    component.setProps({ request: { ...props.request, searchSessionId: '321' } }).update();
    lensProps = component.find(embeddable).props();
    expect(lensProps).toMatchObject(expect.objectContaining(originalProps));
    await act(async () => {
      fetch$.next({ type: 'fetch' });
    });
    component.update();
    lensProps = component.find(embeddable).props();
    expect(lensProps).toMatchObject(
      expect.objectContaining({ ...originalProps, searchSessionId: '321' })
    );
  });

  it('should execute onLoad correctly', async () => {
    const { component, props } = await mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad!;
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
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
    onLoad(true, undefined, dataLoading$);
    expect(props.onLoad).toHaveBeenLastCalledWith(true, undefined, dataLoading$);
    act(() => {
      onLoad?.(false, adapters, dataLoading$);
    });
    expect(props.onLoad).toHaveBeenLastCalledWith(false, adapters, dataLoading$);
  });

  it('should execute onLoad correctly when the request has a failure status', async () => {
    const { component, props } = await mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad!;
    const adapters = createDefaultInspectorAdapters();
    jest
      .spyOn(adapters.requests, 'getRequests')
      .mockReturnValue([{ status: RequestStatus.ERROR } as any]);
    onLoad?.(false, adapters);
    expect(props.onLoad).toHaveBeenLastCalledWith(false, adapters);
  });

  it('should execute onLoad correctly when the response has shard failures', async () => {
    const { component, props } = await mountComponent();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad!;
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
      onLoad?.(false, adapters);
    });
    expect(props.onLoad).toHaveBeenLastCalledWith(false, adapters);
  });

  it('should execute onLoad correctly for textbased language and no Lens suggestions', async () => {
    const { component, props } = await mountComponent(true, false);
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad!;
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
      onLoad?.(false, adapters);
    });
    expect(props.onLoad).toHaveBeenLastCalledWith(false, adapters);
  });

  it('should execute onLoad correctly for textbased language and Lens suggestions', async () => {
    const { component, props } = await mountComponent(true, true);
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent;
    const onLoad = component.find(embeddable).props().onLoad!;
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
      onLoad?.(false, adapters);
    });
    expect(props.onLoad).toHaveBeenLastCalledWith(false, adapters);
  });
});
