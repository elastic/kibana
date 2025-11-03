/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { type ESQLControlVariable, ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import { act } from 'react-dom/test-utils';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { useUnifiedHistogram } from './use_unified_histogram';
import { renderHook, waitFor } from '@testing-library/react';

describe('useUnifiedHistogram', () => {
  it('should initialize', async () => {
    const esqlControlState = {
      'id-1': {
        grow: false,
        order: 0,
        type: 'esqlControl',
        width: 'medium' as const,
        selectedOptions: ['field-1'],
        variableName: 'agent_keyword',
        variableType: ESQLVariableType.VALUES,
        controlType: EsqlControlType.VALUES_FROM_QUERY,
        esqlQuery: 'FROM logstash* | STATS BY field',
        title: 'field',
      },
    };
    const hook = renderHook(() =>
      useUnifiedHistogram({
        services: unifiedHistogramServicesMock,
        initialState: { timeInterval: '42s' },
        dataView: dataViewWithTimefieldMock,
        filters: [],
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
        timeRange: { from: 'now-15m', to: 'now' },
        esqlVariables: [
          {
            key: 'agent_keyword',
            value: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
            type: 'values',
          },
        ] as ESQLControlVariable[],
        controlsState: esqlControlState,
      })
    );
    expect(hook.result.current.isInitialized).toBe(false);
    expect(hook.result.current.api).toBeUndefined();
    expect(hook.result.current.chartProps).toBeUndefined();
    expect(hook.result.current.layoutProps).toBeUndefined();
    await waitFor(() => {
      expect(hook.result.current.isInitialized).toBe(true);
    });
    expect(hook.result.current.api).toBeDefined();
    expect(hook.result.current.chartProps?.chart?.timeInterval).toBe('42s');
    expect(hook.result.current.chartProps?.requestParams.esqlVariables).toEqual([
      {
        key: 'agent_keyword',
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
        type: 'values',
      },
    ]);
    expect(hook.result.current.chartProps?.controlsState).toBe(esqlControlState);
    expect(hook.result.current.layoutProps).toBeDefined();
  });

  it('should trigger input$ when fetch is called', async () => {
    const { result } = renderHook(() =>
      useUnifiedHistogram({
        services: unifiedHistogramServicesMock,
        initialState: { timeInterval: '42s' },
        dataView: dataViewWithTimefieldMock,
        filters: [],
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
        timeRange: { from: 'now-15m', to: 'now' },
      })
    );
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });
    const input$ = result.current.chartProps?.input$;
    const inputSpy = jest.fn();
    input$?.subscribe(inputSpy);
    act(() => {
      result.current.api?.fetch();
    });
    expect(inputSpy).toHaveBeenCalledTimes(1);
    expect(inputSpy).toHaveBeenCalledWith({ type: 'fetch' });
  });
});
