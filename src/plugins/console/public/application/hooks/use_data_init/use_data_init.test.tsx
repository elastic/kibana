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

import { renderHook } from '@testing-library/react-hooks';
import { ContextValue, useEditorActionContext, useServicesContext } from '../../contexts';
import { serviceContextMock } from '../../contexts/services_context.mock';

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

  const callMockFuncWithArg = (arg: MockObjectData[] | Function ) => ({
    ...mockContextValue,
    services: {
      ...mockContextValue.services,
      objectStorageClient: {
        text: {
          findAll: jest.fn(() => arg),
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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls dispatch with new objects, if no texts are provided', async () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    const { result } = renderHook(() => useDataInit(), {});

    await wait(0);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCurrentTextObject',
      payload: mockedObject,
    });
  });

  it('calls dispatch with new objects, if texts are provided', async () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    const mockObj: MockObjectData = {
      createdAt: 1643277939899,
      updatedAt: 1643277939900,
      text: 'Mocked data',
    };

    (useServicesContext as jest.Mock).mockReturnValue(callMockFuncWithArg([mockObj]));

    const { result } = renderHook(() => useDataInit(), {});

    await wait(0);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCurrentTextObject',
      payload: mockObj,
    });
  });

  it('call retry function', async () => {
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

  it('call error function', async () => {
    const error = new Error('Message');

    (useServicesContext as jest.Mock).mockReturnValue(
      callMockFuncWithArg(() => {
        throw error;
      })
    );

    const setErrorMock = jest.fn();
    const useErrorMock: UseStateMock = (state: any) => [state, setErrorMock];

    jest.spyOn(React, 'useState').mockImplementationOnce(useErrorMock);

    expect(setErrorMock).toHaveBeenCalledWith(error);
  });
});
