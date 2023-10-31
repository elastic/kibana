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
import { UnifiedHistogramLayout } from '../layout';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { UnifiedHistogramApi, UnifiedHistogramContainer } from './container';

describe('UnifiedHistogramContainer', () => {
  it('should initialize', async () => {
    let api: UnifiedHistogramApi | undefined;
    const setApi = (ref: UnifiedHistogramApi) => {
      api = ref;
    };
    const getCreationOptions = jest.fn(() => ({ initialState: { timeInterval: '42s' } }));
    const component = mountWithIntl(
      <UnifiedHistogramContainer
        services={unifiedHistogramServicesMock}
        ref={setApi}
        getCreationOptions={getCreationOptions}
        dataView={dataViewWithTimefieldMock}
        filters={[]}
        query={{ language: 'kuery', query: '' }}
        requestAdapter={new RequestAdapter()}
        searchSessionId={'123'}
        timeRange={{ from: 'now-15m', to: 'now' }}
        container={null}
      />
    );
    expect(component.update().isEmptyRender()).toBe(true);
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    component.update();
    expect(getCreationOptions).toHaveBeenCalled();
    expect(component.find(UnifiedHistogramLayout).prop('chart')?.timeInterval).toBe('42s');
    expect(component.update().isEmptyRender()).toBe(false);
    expect(api).toBeDefined();
  });

  it('should trigger input$ when refetch is called', async () => {
    let api: UnifiedHistogramApi | undefined;
    const setApi = (ref: UnifiedHistogramApi) => {
      api = ref;
    };
    const getCreationOptions = jest.fn(() => ({ disableAutoFetching: true }));
    const component = mountWithIntl(
      <UnifiedHistogramContainer
        services={unifiedHistogramServicesMock}
        ref={setApi}
        getCreationOptions={getCreationOptions}
        dataView={dataViewWithTimefieldMock}
        filters={[]}
        query={{ language: 'kuery', query: '' }}
        requestAdapter={new RequestAdapter()}
        searchSessionId={'123'}
        timeRange={{ from: 'now-15m', to: 'now' }}
        container={null}
      />
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    component.update();
    const input$ = component.find(UnifiedHistogramLayout).prop('input$');
    const inputSpy = jest.fn();
    input$?.subscribe(inputSpy);
    act(() => {
      api?.refetch();
    });
    expect(inputSpy).toHaveBeenCalledTimes(1);
    expect(inputSpy).toHaveBeenCalledWith({ type: 'refetch' });
  });
});
