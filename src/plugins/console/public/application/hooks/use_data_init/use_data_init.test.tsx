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

  const callMockFuncWithArg = (arg: MockObjectData[]) => ({
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
});
