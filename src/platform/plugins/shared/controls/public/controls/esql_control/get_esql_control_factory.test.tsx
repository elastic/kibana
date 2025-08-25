/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { EsqlControlType, type ESQLControlState } from '@kbn/esql-types';
import { getMockedControlGroupApi, getMockedFinalizeApi } from '../mocks/control_mocks';
import { getESQLControlFactory } from './get_esql_control_factory';
import type { BehaviorSubject } from 'rxjs';
import type { ControlFetchContext } from '../../control_group/control_fetch';

const MOCK_VALUES_FROM_QUERY = ['option1', 'option2', 'option3', 'option4', 'option5'];

const mockGetESQLSingleColumnValues = jest.fn();
const mockIsSuccess = jest.fn();

jest.mock('./utils/get_esql_single_column_values', () => {
  const getESQLSingleColumnValues = () => {
    mockGetESQLSingleColumnValues();
    return { values: MOCK_VALUES_FROM_QUERY };
  };
  getESQLSingleColumnValues.isSuccess = () => {
    mockIsSuccess();
    return true;
  };
  return {
    getESQLSingleColumnValues,
  };
});

describe('ESQLControlApi', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const uuid = 'myESQLControl';

  const dashboardApi = {};
  const controlGroupApi = getMockedControlGroupApi(dashboardApi);
  const factory = getESQLControlFactory();
  const finalizeApi = getMockedFinalizeApi(uuid, factory, controlGroupApi);

  test('should publish ES|QL variable', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { api } = await factory.buildControl({
      initialState,
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    expect(api.esqlVariable$.value).toStrictEqual({
      key: 'variable1',
      type: 'values',
      value: 'option1',
    });
  });

  test('should serialize state', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { api } = await factory.buildControl({
      initialState,
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    expect(api.serializeState()).toStrictEqual({
      rawState: {
        availableOptions: ['option1', 'option2'],
        controlType: 'STATIC_VALUES',
        esqlQuery: 'FROM foo | WHERE column = ?variable1',
        grow: false,
        selectedOptions: ['option1'],
        title: '',
        variableName: 'variable1',
        variableType: 'values',
        width: 'medium',
      },
      references: [],
    });
  });

  describe('values from query', () => {
    test('should update on load and fetch', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        variableName: 'variable1',
        variableType: 'values',
        esqlQuery: 'FROM foo | STATS BY column',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
      } as ESQLControlState;
      await factory.buildControl({
        initialState,
        finalizeApi,
        uuid,
        controlGroupApi,
      });
      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(1);
        expect(mockIsSuccess).toHaveBeenCalledTimes(1);
      });
      const controlFetch$ = controlGroupApi.controlFetch$(
        uuid
      ) as BehaviorSubject<ControlFetchContext>;
      controlFetch$.next({});
      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(2);
        expect(mockIsSuccess).toHaveBeenCalledTimes(2);
      });
    });

    test('should load availableOptions but not serialize them', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        variableName: 'variable1',
        variableType: 'values',
        esqlQuery: 'FROM foo | STATS BY column',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
      } as ESQLControlState;
      const { Component, api } = await factory.buildControl({
        initialState,
        finalizeApi,
        uuid,
        controlGroupApi,
      });

      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(1);
        expect(mockIsSuccess).toHaveBeenCalledTimes(1);
      });

      const { findByTestId, findAllByRole } = render(<Component className="" />);
      fireEvent.click(await findByTestId('optionsListSelections'));
      const availableOptions = await findAllByRole('option');
      expect(availableOptions.length).toBe(5);

      const serializedState = api.serializeState();
      expect('availableOptions' in serializedState).toBeFalsy();
      expect(serializedState.rawState).toMatchInlineSnapshot(`
        Object {
          "controlType": "VALUES_FROM_QUERY",
          "esqlQuery": "FROM foo | STATS BY column",
          "grow": false,
          "selectedOptions": Array [
            "option1",
          ],
          "title": "",
          "variableName": "variable1",
          "variableType": "values",
          "width": "medium",
        }
      `);
    });
  });

  describe('changing the dropdown', () => {
    test('should publish new ES|QL variable', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        availableOptions: ['option1', 'option2'],
        variableName: 'variable1',
        variableType: 'values',
        esqlQuery: 'FROM foo | WHERE column = ?variable1',
        controlType: 'STATIC_VALUES',
      } as ESQLControlState;
      const { Component, api } = await factory.buildControl({
        initialState,
        finalizeApi,
        uuid,
        controlGroupApi,
      });

      expect(api.esqlVariable$.value).toStrictEqual({
        key: 'variable1',
        type: 'values',
        value: 'option1',
      });

      const { findByTestId, findByTitle } = render(<Component className="" />);
      fireEvent.click(await findByTestId('optionsListSelections'));
      fireEvent.click(await findByTitle('option2'));

      await waitFor(() => {
        expect(api.esqlVariable$.value).toStrictEqual({
          key: 'variable1',
          type: 'values',
          value: 'option2',
        });
      });
    });
  });
});
