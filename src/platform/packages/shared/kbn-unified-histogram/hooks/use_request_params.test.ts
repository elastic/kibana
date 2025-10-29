/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { unifiedHistogramServicesMock } from '../__mocks__/services';

const getUseRequestParams = async () => {
  jest.doMock('@kbn/data-plugin/common', () => {
    return {
      ...jest.requireActual('@kbn/data-plugin/common'),
      getAbsoluteTimeRange: jest.fn((range) => range),
    };
  });
  return (await import('./use_request_params')).useRequestParams;
};

describe('useRequestParams', () => {
  it('should only update getTimeRange after updateTimeRange is called', async () => {
    const useRequestParams = await getUseRequestParams();
    const originalTimeRange = {
      from: 'now-15m',
      to: 'now',
    };
    const originalProps = {
      services: unifiedHistogramServicesMock,
      timeRange: originalTimeRange,
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    };
    const hook = renderHook((props) => useRequestParams(props), {
      initialProps: originalProps,
    });
    expect(hook.result.current.getTimeRange()).toEqual(originalTimeRange);
    const newTimeRange = { from: 'now-30m', to: 'now' };
    hook.rerender({ ...originalProps, timeRange: newTimeRange });
    expect(hook.result.current.getTimeRange()).toEqual(originalTimeRange);
    hook.result.current.updateTimeRange();
    expect(hook.result.current.getTimeRange()).toEqual(newTimeRange);
  });
});
