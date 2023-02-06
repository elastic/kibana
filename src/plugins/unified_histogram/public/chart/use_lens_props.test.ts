/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { Subject } from 'rxjs';
import type { UnifiedHistogramInputMessage } from '../types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { getLensAttributes } from './get_lens_attributes';
import { getLensProps, useLensProps } from './use_lens_props';

describe('useLensProps', () => {
  it('should return lens props', () => {
    const getTimeRange = jest.fn();
    const refetch$ = new Subject<UnifiedHistogramInputMessage>();
    const onLoad = jest.fn();
    const attributes = getLensAttributes({
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
    const lensProps = renderHook(() => {
      return useLensProps({
        request: {
          searchSessionId: 'id',
          adapter: undefined,
        },
        getTimeRange,
        refetch$,
        attributes,
        onLoad,
      });
    });
    expect(lensProps.result.current).toEqual(
      getLensProps({
        searchSessionId: 'id',
        getTimeRange,
        attributes,
        onLoad,
      })
    );
  });

  it('should only update lens props when refetch$ is triggered', () => {
    const getTimeRange = jest.fn();
    const refetch$ = new Subject<UnifiedHistogramInputMessage>();
    const onLoad = jest.fn();
    const lensProps = {
      request: {
        searchSessionId: '123',
        adapter: undefined,
      },
      getTimeRange,
      refetch$,
      attributes: getLensAttributes({
        title: 'test',
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        dataView: dataViewWithTimefieldMock,
        timeInterval: 'auto',
        breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
      }),
      onLoad,
    };
    const hook = renderHook(
      (props) => {
        return useLensProps(props);
      },
      { initialProps: lensProps }
    );
    const originalProps = hook.result.current;
    hook.rerender({ ...lensProps, request: { searchSessionId: '456', adapter: undefined } });
    expect(hook.result.current).toEqual(originalProps);
    act(() => {
      refetch$.next({ type: 'refetch' });
    });
    expect(hook.result.current).not.toEqual(originalProps);
  });
});
