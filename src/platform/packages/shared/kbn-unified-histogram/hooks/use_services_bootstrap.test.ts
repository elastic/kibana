/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { useServicesBootstrap } from './use_services_bootstrap';
import { renderHook } from '@testing-library/react';
import { getBreakdownField } from '../utils/local_storage_utils';
import { createStateService } from '../services/state_service';
import { useStateProps } from './use_state_props';
import { useRequestParams } from './use_request_params';

jest.mock('../services/state_service');
jest.mock('./use_state_props');
jest.mock('./use_request_params');
jest.mock('../utils/local_storage_utils');

const createStateServiceMock = createStateService as jest.MockedFunction<typeof createStateService>;
const useStatePropsMock = useStateProps as jest.MockedFunction<typeof useStateProps>;
const useRequestParamsMock = useRequestParams as jest.MockedFunction<typeof useRequestParams>;
const getBreakdownFieldMock = getBreakdownField as jest.MockedFunction<typeof getBreakdownField>;

describe('useServicesBootstrap', () => {
  const localStorageKeyPrefix = 'discover';
  const query = {
    esql: 'FROM index',
  };

  beforeEach(() => {
    useStatePropsMock.mockReturnValue({
      chart: {
        hidden: false,
        timeInterval: 'auto',
      },
    } as ReturnType<typeof useStateProps>);

    useRequestParamsMock.mockReturnValue({
      query,
    } as ReturnType<typeof useRequestParams>);
  });

  it('should initialize', async () => {
    const hook = renderHook(() =>
      useServicesBootstrap({
        services: unifiedHistogramServicesMock,
        dataView: dataViewWithTimefieldMock,
        localStorageKeyPrefix,
        query,
      })
    );

    expect(createStateServiceMock).toBeCalledTimes(1);
    expect(getBreakdownFieldMock).toBeCalledTimes(1);
    expect(useStatePropsMock).toBeCalledTimes(1);
    expect(useRequestParamsMock).toBeCalledTimes(1);

    expect(hook.result.current.api).not.toBeUndefined();
    expect(hook.result.current.input$).not.toBeUndefined();
    expect(hook.result.current.requestParams).toEqual({
      query,
    });
    expect(hook.result.current.stateProps).toEqual({
      chart: { hidden: false, timeInterval: 'auto' },
    });
  });
});
