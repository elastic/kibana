/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { EsqlControlType, ESQLVariableType, type ESQLControlState } from '@kbn/esql-types';
import { initializeESQLControlManager } from './esql_control_manager';
import { BehaviorSubject } from 'rxjs';

const MOCK_VALUES_FROM_QUERY = ['option1', 'option2', 'option3', 'option4', 'option5'];

jest.mock('./utils/get_esql_single_column_values', () => {
  const getESQLSingleColumnValues = () => {
    return { values: MOCK_VALUES_FROM_QUERY };
  };
  getESQLSingleColumnValues.isSuccess = () => {
    return true;
  };
  return {
    getESQLSingleColumnValues,
  };
});

const mockFetch$ = new BehaviorSubject({});
jest.mock('@kbn/presentation-publishing', () => ({
  ...jest.requireActual('@kbn/presentation-publishing'),
  fetch$: () => mockFetch$,
}));

describe('initializeESQLControlManager', () => {
  const uuid = 'myESQLControl';

  const dashboardApi = {};

  describe('values from query', () => {
    test('should load availableOptions but not serialize them', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        availableOptions: ['option1', 'option2'], // Test backwards compatibility with serialized availableOptions
        variableName: 'variable1',
        variableType: 'values',
        esqlQuery: 'FROM foo | STATS BY column',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
      } as ESQLControlState;

      let dataHasLoaded = false;
      const selections = initializeESQLControlManager(uuid, dashboardApi, initialState, jest.fn());

      selections.internalApi.availableOptions$.subscribe((result) => {
        if (result?.length === 5) dataHasLoaded = true;
      });

      await waitFor(() => {
        expect(dataHasLoaded).toBe(true);
      });

      const latestState = selections.getLatestState();
      expect('availableOptions' in latestState).toBeFalsy();
      expect(latestState).toMatchInlineSnapshot(`
        Object {
          "controlType": "VALUES_FROM_QUERY",
          "esqlQuery": "FROM foo | STATS BY column",
          "selectedOptions": Array [
            "option1",
          ],
          "singleSelect": true,
          "title": "",
          "variableName": "variable1",
          "variableType": "values",
        }
      `);
    });
  });

  describe('static values', () => {
    test('should not load availableOptions and instead just serialize them', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        availableOptions: ['option1', 'option2'],
        variableName: 'variable1',
        variableType: 'values',
        controlType: EsqlControlType.STATIC_VALUES,
      } as ESQLControlState;

      const selections = initializeESQLControlManager(uuid, dashboardApi, initialState, jest.fn());

      await waitFor(() => {
        const availableOptions = selections.internalApi.availableOptions$.getValue();
        expect(availableOptions?.length).toBe(2);
      });

      const latestState = selections.getLatestState();
      expect(latestState).toMatchInlineSnapshot(`
        Object {
          "availableOptions": Array [
            "option1",
            "option2",
          ],
          "controlType": "STATIC_VALUES",
          "esqlQuery": "",
          "selectedOptions": Array [
            "option1",
          ],
          "singleSelect": true,
          "title": "",
          "variableName": "variable1",
          "variableType": "values",
        }
      `);
    });
  });

  describe('esqlVariable$', () => {
    test('should emit single value for single-select mode', async () => {
      const initialState = {
        selectedOptions: ['option1'],
        availableOptions: ['option1', 'option2'],
        variableName: 'myVariable',
        variableType: 'values',
        controlType: EsqlControlType.STATIC_VALUES,
        singleSelect: true,
        title: 'Test Control',
        esqlQuery: '',
      } as ESQLControlState;

      const selections = initializeESQLControlManager(uuid, dashboardApi, initialState, jest.fn());
      await waitFor(() => {
        const variable = selections.api.esqlVariable$.getValue();
        expect(variable).toEqual({
          key: 'myVariable',
          value: 'option1',
          type: 'values',
          meta: {
            controlledBy: 'myESQLControl',
          },
        });
      });
    });

    test('should emit array for multi-select mode', async () => {
      const initialState = {
        selectedOptions: ['option1', 'option2'],
        availableOptions: ['option1', 'option2', 'option3'],
        variableName: 'myVariable',
        variableType: 'values',
        controlType: EsqlControlType.STATIC_VALUES,
        singleSelect: false,
        title: 'Test Control',
        esqlQuery: '',
      } as ESQLControlState;

      const selections = initializeESQLControlManager(uuid, dashboardApi, initialState, jest.fn());
      await waitFor(() => {
        const variable = selections.api.esqlVariable$.getValue();
        expect(variable).toEqual({
          key: 'myVariable',
          value: ['option1', 'option2'],
          type: 'values',
          meta: {
            controlledBy: 'myESQLControl',
          },
        });
      });
    });
  });

  describe('chaining variables controls', () => {
    test('should refetch values when the query variables change', async () => {
      const initialState = {
        selectedOptions: [],
        variableName: 'variable2',
        variableType: ESQLVariableType.VALUES,
        // query depends on another variable
        esqlQuery: 'FROM foo | WHERE column1 == ?variable1 | STATS BY column2',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
        singleSelect: true,
        title: 'My variable',
      } as ESQLControlState;

      const setDataLoadingMock = jest.fn();
      initializeESQLControlManager(uuid, dashboardApi, initialState, setDataLoadingMock);

      setDataLoadingMock.mockClear();
      // Initial variables
      mockFetch$.next({
        esqlVariables: [
          {
            key: 'variable1',
            value: 'newValue1',
            type: ESQLVariableType.VALUES,
          },
        ],
      });

      await waitFor(() => {
        expect(setDataLoadingMock).toHaveBeenCalledWith(false);
      });

      // Change the variable
      setDataLoadingMock.mockClear();
      mockFetch$.next({
        esqlVariables: [
          {
            key: 'variable1',
            value: 'newValue2',
            type: ESQLVariableType.VALUES,
          },
        ],
      });

      await waitFor(() => {
        expect(setDataLoadingMock).toHaveBeenCalledWith(true);
      });
    });

    test("should not refetch when the variable value doesn't change", async () => {
      const initialState = {
        selectedOptions: [],
        variableName: 'variable1',
        variableType: ESQLVariableType.VALUES,
        esqlQuery: 'FROM foo | WHERE column1 == ?variable2 | STATS BY column2',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
        singleSelect: true,
        title: 'My variable',
      } as ESQLControlState;

      const setDataLoadingMock = jest.fn();
      initializeESQLControlManager(uuid, dashboardApi, initialState, setDataLoadingMock);

      // Initial variables
      mockFetch$.next({
        esqlVariables: [
          {
            key: 'variable1',
            value: 'newValue1',
            type: ESQLVariableType.VALUES,
          },
        ],
      });

      await waitFor(() => {
        expect(setDataLoadingMock).toHaveBeenCalledWith(false);
      });

      setDataLoadingMock.mockClear();
      mockFetch$.next({
        esqlVariables: [
          {
            key: 'variable1',
            value: 'newValue1',
            type: ESQLVariableType.VALUES,
          },
        ],
      });

      expect(setDataLoadingMock).not.toHaveBeenCalled();
    });

    test('should refetch values when the timeRange changes', async () => {
      const initialState = {
        selectedOptions: [],
        variableName: 'variable1',
        variableType: ESQLVariableType.VALUES,
        esqlQuery: 'FROM foo | WHERE @timestamp >= ?start AND @timestamp <= ?end | STATS BY column',
        controlType: EsqlControlType.VALUES_FROM_QUERY,
        singleSelect: true,
        title: 'My variable',
      } as ESQLControlState;

      const setDataLoadingMock = jest.fn();
      initializeESQLControlManager(uuid, dashboardApi, initialState, setDataLoadingMock);

      setDataLoadingMock.mockClear();
      // Initial fetch with timeRange
      mockFetch$.next({
        timeRange: { from: '2024-01-01', to: '2024-01-31' },
        esqlVariables: [],
      });

      await waitFor(() => {
        expect(setDataLoadingMock).toHaveBeenCalledWith(false);
      });

      // Change the timeRange (query and variables stay the same)
      setDataLoadingMock.mockClear();
      mockFetch$.next({
        timeRange: { from: '2024-02-01', to: '2024-02-28' },
        esqlVariables: [],
      });

      await waitFor(() => {
        expect(setDataLoadingMock).toHaveBeenCalledWith(true);
      });
    });
  });
});
