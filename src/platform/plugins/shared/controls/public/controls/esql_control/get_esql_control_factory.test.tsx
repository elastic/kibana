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
import { EsqlControlType, ESQLVariableType, type ESQLControlState } from '@kbn/esql-types';
import { getMockedFinalizeApi } from '../mocks/control_mocks';
import { getESQLControlFactory } from './get_esql_control_factory';
import { BehaviorSubject } from 'rxjs';

const mockGetESQLSingleColumnValues = jest.fn(() => ({ options: ['option1', 'option2'] }));
const mockIsSuccess = jest.fn(() => true);

const mockFetch$ = new BehaviorSubject({});
jest.mock('@kbn/presentation-publishing', () => ({
  ...jest.requireActual('@kbn/presentation-publishing'),
  fetch$: () => mockFetch$,
}));

jest.mock('./utils/get_esql_single_column_values', () => {
  const getESQLSingleColumnValues = () => mockGetESQLSingleColumnValues();
  getESQLSingleColumnValues.isSuccess = () => mockIsSuccess();
  return {
    getESQLSingleColumnValues,
  };
});

describe('ESQLControlApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const uuid = 'myESQLControl';

  const dashboardApi = {};
  const factory = getESQLControlFactory();
  const finalizeApi = getMockedFinalizeApi(uuid, factory, dashboardApi);

  test('should publish ES|QL variable', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { api } = await factory.buildEmbeddable({
      initialState,
      finalizeApi,
      uuid,
      parentApi: dashboardApi,
    });
    expect(api.esqlVariable$.value).toStrictEqual({
      key: 'variable1',
      type: 'values',
      value: 'option1',
      meta: {
        controlledBy: 'myESQLControl',
      },
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
    const { api } = await factory.buildEmbeddable({
      initialState,
      finalizeApi,
      uuid,
      parentApi: dashboardApi,
    });
    expect(api.serializeState()).toStrictEqual({
      availableOptions: ['option1', 'option2'],
      controlType: 'STATIC_VALUES',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      selectedOptions: ['option1'],
      title: '',
      variableName: 'variable1',
      variableType: 'values',
      singleSelect: true,
    });
  });

  describe('values from query', () => {
    test('should update on load and fetch', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        availableOptions: ['option1', 'option2'],
        variableName: 'variable1',
        variableType: 'values',
        esqlQuery: 'FROM foo | STATS BY column',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
      } as ESQLControlState;
      await factory.buildEmbeddable({
        initialState,
        finalizeApi,
        uuid,
        parentApi: dashboardApi,
      });
      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(1);
        expect(mockIsSuccess).toHaveBeenCalledTimes(1);
      });
      mockFetch$.next({});
    });

    test('should update when variables change for queries with dependencies', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        variableName: 'variable2',
        variableType: 'values',
        esqlQuery: 'FROM foo | WHERE column1 == ?variable1 | STATS BY column2',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
      } as ESQLControlState;
      await factory.buildEmbeddable({
        initialState,
        finalizeApi,
        uuid,
        parentApi: dashboardApi,
      });
      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(1);
        expect(mockIsSuccess).toHaveBeenCalledTimes(1);
      });
      // Variable change
      mockFetch$.next({
        esqlVariables: [
          {
            key: 'variable1',
            value: 'newValue',
            type: ESQLVariableType.VALUES,
          },
        ],
      });

      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(2);
        expect(mockIsSuccess).toHaveBeenCalledTimes(2);
      });
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
      const { Component, api } = await factory.buildEmbeddable({
        initialState,
        finalizeApi,
        uuid,
        parentApi: dashboardApi,
      });

      expect(api.esqlVariable$.value).toStrictEqual({
        key: 'variable1',
        type: 'values',
        value: 'option1',
        meta: {
          controlledBy: 'myESQLControl',
        },
      });

      const { findByTestId, findByTitle } = render(<Component />);
      fireEvent.click(await findByTestId('optionsListSelections'));
      fireEvent.click(await findByTitle('option2'));

      await waitFor(() => {
        expect(api.esqlVariable$.value).toStrictEqual({
          key: 'variable1',
          type: 'values',
          value: 'option2',
          meta: {
            controlledBy: 'myESQLControl',
          },
        });
      });
    });
  });
});
