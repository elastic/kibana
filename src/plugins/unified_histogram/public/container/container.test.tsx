/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { UnifiedHistogramFetchStatus } from '../types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { UnifiedHistogramApi, UnifiedHistogramContainer } from './container';
import type { UnifiedHistogramState } from './services/state_service';

describe('UnifiedHistogramContainer', () => {
  const initialState: UnifiedHistogramState = {
    breakdownField: 'bytes',
    chartHidden: false,
    dataView: dataViewWithTimefieldMock,
    filters: [],
    lensRequestAdapter: new RequestAdapter(),
    query: { language: 'kuery', query: '' },
    requestAdapter: new RequestAdapter(),
    searchSessionId: '123',
    timeInterval: 'auto',
    timeRange: { from: 'now-15m', to: 'now' },
    topPanelHeight: 100,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    totalHitsResult: undefined,
    columns: [],
    currentSuggestion: undefined,
  };

  it('should set ref', () => {
    let api: UnifiedHistogramApi | undefined;
    const setApi = (ref: UnifiedHistogramApi) => {
      api = ref;
    };
    mountWithIntl(<UnifiedHistogramContainer ref={setApi} resizeRef={{ current: null }} />);
    expect(api).toBeDefined();
  });

  it('should return null if not initialized', async () => {
    const component = mountWithIntl(<UnifiedHistogramContainer resizeRef={{ current: null }} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(component.update().isEmptyRender()).toBe(true);
  });

  it('should not return null if initialized', async () => {
    const setApi = (api: UnifiedHistogramApi | null) => {
      if (!api || api.initialized) {
        return;
      }
      api?.initialize({
        services: unifiedHistogramServicesMock,
        initialState,
      });
    };
    const component = mountWithIntl(
      <UnifiedHistogramContainer ref={setApi} resizeRef={{ current: null }} />
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(component.update().isEmptyRender()).toBe(false);
  });

  it('should update initialized property when initialized', async () => {
    let api: UnifiedHistogramApi | undefined;
    const setApi = (ref: UnifiedHistogramApi) => {
      api = ref;
    };
    mountWithIntl(<UnifiedHistogramContainer ref={setApi} resizeRef={{ current: null }} />);
    expect(api?.initialized).toBe(false);
    act(() => {
      if (!api?.initialized) {
        api?.initialize({
          services: unifiedHistogramServicesMock,
          initialState,
        });
      }
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(api?.initialized).toBe(true);
  });
});
