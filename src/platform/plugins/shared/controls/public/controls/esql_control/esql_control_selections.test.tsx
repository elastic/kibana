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
import { getMockedControlGroupApi } from '../mocks/control_mocks';
import type { ControlFetchContext } from '../../control_group/control_fetch';
import { initializeESQLControlSelections } from './esql_control_selections';
import type { BehaviorSubject } from 'rxjs';

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

describe('initializeESQLControlSelections', () => {
  const uuid = 'myESQLControl';

  const dashboardApi = {};
  const controlGroupApi = getMockedControlGroupApi(dashboardApi);
  const controlFetch$ = controlGroupApi.controlFetch$(uuid) as BehaviorSubject<ControlFetchContext>;

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

      const selections = initializeESQLControlSelections(initialState, controlFetch$, jest.fn());

      await waitFor(() => {
        expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(1);
        expect(mockIsSuccess).toHaveBeenCalledTimes(1);
      });

      const availableOptions = selections.internalApi.availableOptions$.getValue();
      expect(availableOptions?.length).toBe(5);

      const latestState = selections.getLatestState();
      expect('availableOptions' in latestState).toBeFalsy();
      expect(latestState).toMatchInlineSnapshot(`
        Object {
          "controlType": "VALUES_FROM_QUERY",
          "esqlQuery": "FROM foo | STATS BY column",
          "selectedOptions": Array [
            "option1",
          ],
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

      const selections = initializeESQLControlSelections(initialState, controlFetch$, jest.fn());

      const availableOptions = selections.internalApi.availableOptions$.getValue();
      expect(availableOptions?.length).toBe(2);

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
          "title": "",
          "variableName": "variable1",
          "variableType": "values",
        }
      `);
    });

    expect(mockGetESQLSingleColumnValues).toHaveBeenCalledTimes(0);
    expect(mockIsSuccess).toHaveBeenCalledTimes(0);
  });
});
