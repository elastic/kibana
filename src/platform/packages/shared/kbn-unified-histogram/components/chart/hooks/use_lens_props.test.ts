/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { ReplaySubject } from 'rxjs';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import type { UnifiedHistogramFetchParams, UnifiedHistogramFetch$ } from '../../../types';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { getLensVisMock } from '../../../__mocks__/lens_vis';
import { getFetchParamsMock } from '../../../__mocks__/fetch_params';
import { useLensProps } from './use_lens_props';

describe('useLensProps', () => {
  it('should return lens props', async () => {
    const fetch$: UnifiedHistogramFetch$ = new ReplaySubject(1);
    const onLoad = jest.fn();
    const fetchParams: UnifiedHistogramFetchParams = getFetchParamsMock();
    const lensVisMock = await getLensVisMock({
      filters: fetchParams.filters,
      query: fetchParams.query,
      columns: [],
      isPlainRecord: fetchParams.isESQLQuery,
      dataView: fetchParams.dataView,
      timeInterval: 'auto',
      breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
    });
    fetchParams.externalVisContext = lensVisMock.visContext;

    const lensProps = renderHook(() => {
      return useLensProps({
        fetch$,
        fetchParams,
        lensVisService: lensVisMock.lensService,
        onLoad,
      });
    });
    act(() => {
      fetch$.next(fetchParams);
    });
    expect(lensProps.result.current?.lensProps).toMatchSnapshot();
  });

  it('should return lens props for text based languages', async () => {
    const fetch$: UnifiedHistogramFetch$ = new ReplaySubject(1);
    const onLoad = jest.fn();
    const query = { esql: 'FROM logs* | WHERE ??field >= ?otherVar' };
    const esqlVariables: ESQLControlVariable[] = [
      { key: 'field', value: 'variableColumn', type: ESQLVariableType.FIELDS },
      { key: 'otherVar', value: 'someOtherValue', type: ESQLVariableType.VALUES },
    ];
    const fetchParams: UnifiedHistogramFetchParams = getFetchParamsMock({
      query,
      esqlVariables,
    });
    const lensVisMock = await getLensVisMock({
      filters: fetchParams.filters,
      query: fetchParams.query,
      columns: [],
      isPlainRecord: fetchParams.isESQLQuery,
      dataView: fetchParams.dataView,
      timeInterval: 'auto',
      breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
    });
    fetchParams.externalVisContext = lensVisMock.visContext;

    const lensProps = renderHook(() => {
      return useLensProps({
        fetch$,
        fetchParams,
        lensVisService: lensVisMock.lensService,
        onLoad,
      });
    });
    act(() => {
      fetch$.next(fetchParams);
    });
    expect(lensProps.result.current?.lensProps).toMatchSnapshot();
  });

  it('should only return lens props after fetch$ is triggered', async () => {
    const fetch$: UnifiedHistogramFetch$ = new ReplaySubject(1);
    const onLoad = jest.fn();
    const fetchParams: UnifiedHistogramFetchParams = getFetchParamsMock();
    const lensVisMock = await getLensVisMock({
      filters: fetchParams.filters,
      query: fetchParams.query,
      columns: [],
      isPlainRecord: fetchParams.isESQLQuery,
      dataView: fetchParams.dataView,
      timeInterval: 'auto',
      breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
    });
    fetchParams.externalVisContext = lensVisMock.visContext;

    const lensProps = {
      fetch$,
      fetchParams,
      lensVisService: lensVisMock.lensService,
      onLoad,
    };
    const hook = renderHook(
      (props) => {
        return useLensProps(props);
      },
      { initialProps: lensProps }
    );
    expect(hook.result.current).toEqual(undefined);

    const updatedFetchParams = { ...fetchParams, searchSessionId: '456' };
    hook.rerender({ ...lensProps, fetchParams: updatedFetchParams });
    expect(hook.result.current).toEqual(undefined);
    act(() => {
      fetch$.next(updatedFetchParams);
    });
    expect(hook.result.current).not.toEqual(undefined);
  });
});
