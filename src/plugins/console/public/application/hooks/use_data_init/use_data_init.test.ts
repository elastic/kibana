/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

jest.mock('../../contexts', () => ({
  useEditorActionContext: jest.fn(),
  useServicesContext: jest.fn(),
}));

jest.mock('./data_migration', () => ({
  migrateToTextObjects: jest.fn(),
}));

import { renderHook } from '@testing-library/react-hooks';
import { ContextValue, useEditorActionContext, useServicesContext } from '../../contexts';
import { serviceContextMock } from '../../contexts/services_context.mock';
import { migrateToTextObjects } from './data_migration';

import { useDataInit } from './use_data_init';

type UseStateMock = (...args: unknown[]) => [any, jest.Mock];
const wait = (period: number) => new Promise((res) => setTimeout(res, period));

describe('useDataInit', () => {
  let mockContextValue: ContextValue;
  let dispatch: (...args: unknown[]) => void;
  let useStateMock: (...args: unknown[]) => [any, jest.Mock];
  let setStateMock: jest.Mock;
  const mockedObject = { mocked: true };

  interface MockObjectData {
    createdAt: number;
    updatedAt: number;
    text: string;
  }

  const callMockFuncWithArg = (arg: MockObjectData[] | Function | any) => ({
    ...mockContextValue,
    services: {
      ...mockContextValue.services,
      objectStorageClient: {
        text: {
          findAll: jest.fn(() => (typeof arg === 'function' ? arg() : arg)),
          create: jest.fn((data: any) => mockedObject),
        },
      },
    },
  });

  beforeAll(() => {
    setStateMock = jest.fn();
    useStateMock = (state: any) => [state, setStateMock];
    mockContextValue = serviceContextMock.create();
    dispatch = jest.fn();
    // migrateToTextObjects = jest.fn();
    (useEditorActionContext as jest.Mock).mockReturnValue(dispatch);
    (useServicesContext as jest.Mock).mockReturnValue({
      ...mockContextValue,
      services: {
        ...mockContextValue.services,
        objectStorageClient: {
          text: {
            findAll: jest.fn(() => []),
            create: jest.fn((data: any) => mockedObject),
          },
        },
      },
    });
    // (migrateToTextObjects as jest.Mock).mockImplementation()
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should calls dispatch with new objects if no texts are provided', async () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCurrentTextObject',
      payload: mockedObject,
    });
  });

  it('should calls dispatch with new objects if texts are provided', async () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    const mockObj: MockObjectData = {
      createdAt: 1643277939899,
      updatedAt: 1643277939900,
      text: 'Mocked data',
    };

    (useServicesContext as jest.Mock).mockReturnValue(callMockFuncWithArg([mockObj]));

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCurrentTextObject',
      payload: mockObj,
    });
  });

  it('should update the states if the retry function is called', () => {
    const setErrorMock = jest.fn();
    const useErrorMock: UseStateMock = (state: any) => [state, setErrorMock];

    const setDoneMock = jest.fn();
    const useDoneMock: UseStateMock = (state: any) => [state, setDoneMock];

    const setRetryTokenMock = jest.fn();
    const useRetryTokenMock: UseStateMock = (state: any) => [state, setRetryTokenMock];

    jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(useErrorMock)
      .mockImplementationOnce(useDoneMock)
      .mockImplementationOnce(useRetryTokenMock);

    const { result } = renderHook(() => useDataInit(), {});

    result.current.retry();

    expect(setErrorMock).toHaveBeenCalledWith(null);
    expect(setDoneMock).toHaveBeenCalledWith(false);
    expect(setRetryTokenMock).toHaveBeenCalledWith({});
  });

  it('should update the error state if case of getting an exception while loading data', async () => {
    const error = new Error('Message');

    (useServicesContext as jest.Mock).mockReturnValue(
      callMockFuncWithArg(() => {
        throw error;
      })
    );

    const setDoneMock = jest.fn();
    const setErrorMock = jest.fn();
    const setRetryTokenMock = jest.fn();
    const useDoneMock: UseStateMock = (state: any) => [state, setDoneMock];
    const useErrorMock: UseStateMock = (state: any) => [state, setErrorMock];
    const useRetryTokenMock: UseStateMock = (state: any) => [state, setRetryTokenMock];

    jest.spyOn(React, 'useState').mockImplementationOnce(useErrorMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useDoneMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useRetryTokenMock);

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(setErrorMock).toHaveBeenCalledWith(error);
  });

  it('should update the done state when we get into the finally block', async () => {
    const setDoneMock = jest.fn();
    const setErrorMock = jest.fn();
    const setRetryTokenMock = jest.fn();
    const useDoneMock: UseStateMock = (state: any) => [state, setDoneMock];
    const useErrorMock: UseStateMock = (state: any) => [state, setErrorMock];
    const useRetryTokenMock: UseStateMock = (state: any) => [state, setRetryTokenMock];

    jest.spyOn(React, 'useState').mockImplementationOnce(useErrorMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useDoneMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useRetryTokenMock);

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(setDoneMock).toHaveBeenCalledWith(true);
  });

  it('should call migrateToTextObjects function', async () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(migrateToTextObjects).toBeCalledTimes(1);
  });
});
