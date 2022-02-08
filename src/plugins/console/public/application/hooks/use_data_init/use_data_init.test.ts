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

interface TextObject {
  createdAt: number;
  updatedAt: number;
  text: string;
}

describe('useDataInit', () => {
  let mockContextValue: ContextValue;
  let dispatch: (...args: unknown[]) => void;
  let useStateMock: (...args: unknown[]) => [any, jest.Mock];
  let setStateMock: jest.Mock;
  const textObject = { mocked: true };

  const createContextValueMock = (arg: TextObject[] | Function | object) => ({
    ...mockContextValue,
    services: {
      ...mockContextValue.services,
      objectStorageClient: {
        text: {
          findAll: jest.fn(() => (typeof arg === 'function' ? arg() : arg)),
          create: jest.fn((data: any) => textObject),
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
    (useServicesContext as jest.Mock).mockReturnValue(createContextValueMock([]));
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
      payload: textObject,
    });
  });

  it('should calls dispatch with new objects if texts are provided', async () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    const mockObj: TextObject = {
      createdAt: 1643277939899,
      updatedAt: 1643277939900,
      text: 'Mocked data',
    };

    (useServicesContext as jest.Mock).mockReturnValue(createContextValueMock([mockObj]));

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCurrentTextObject',
      payload: mockObj,
    });
  });

  it('should reset internal state if the retry function is called', () => {
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

  it('should update the error state in case of getting an exception while loading data', async () => {
    const error = new Error('Message');

    (useServicesContext as jest.Mock).mockReturnValue(
      createContextValueMock(() => {
        throw error;
      })
    );
    const setErrorMock = jest.fn();

    const useErrorMock: UseStateMock = (state: any) => [state, setErrorMock];

    jest.spyOn(React, 'useState').mockImplementationOnce(useErrorMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useStateMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useStateMock);

    renderHook(() => useDataInit(), {});

    await wait(0);

    expect(setErrorMock).toHaveBeenCalledWith(error);
  });

  it('should change the internal state to done after data loading in any case.', async () => {
    const setDoneMock = jest.fn();

    const useDoneMock: UseStateMock = (state: any) => [state, setDoneMock];

    jest.spyOn(React, 'useState').mockImplementationOnce(useStateMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useDoneMock);
    jest.spyOn(React, 'useState').mockImplementationOnce(useStateMock);

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
