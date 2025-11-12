/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { EsqlControlType, type ESQLControlState } from '@kbn/esql-types';
import { initializeESQLControlSelections } from './esql_control_selections';

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

describe('initializeESQLControlSelections', () => {
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
      const selections = initializeESQLControlSelections(
        uuid,
        dashboardApi,
        initialState,
        jest.fn()
      );

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

      const selections = initializeESQLControlSelections(
        uuid,
        dashboardApi,
        initialState,
        jest.fn()
      );

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

      const selections = initializeESQLControlSelections(
        uuid,
        dashboardApi,
        initialState,
        jest.fn()
      );
      await waitFor(() => {
        const variable = selections.api.esqlVariable$.getValue();
        expect(variable).toEqual({
          key: 'myVariable',
          value: 'option1',
          type: 'values',
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

      const selections = initializeESQLControlSelections(
        uuid,
        dashboardApi,
        initialState,
        jest.fn()
      );
      await waitFor(() => {
        const variable = selections.api.esqlVariable$.getValue();
        expect(variable).toEqual({
          key: 'myVariable',
          value: ['option1', 'option2'],
          type: 'values',
        });
      });
    });
  });
});
