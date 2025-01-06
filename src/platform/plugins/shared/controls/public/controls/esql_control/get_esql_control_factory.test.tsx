/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { StateComparators } from '@kbn/presentation-publishing';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { esqlVariablesService } from '@kbn/esql-variables/common';
import { getMockedControlGroupApi } from '../mocks/control_mocks';
import type { ControlApiRegistration } from '../types';
import { getESQLControlFactory } from './get_esql_control_factory';
import type { ESQLControlApi, ESQLControlState } from './types';

describe('ESQLControlApi', () => {
  const uuid = 'myESQLControl';

  const dashboardApi = {};
  const controlGroupApi = getMockedControlGroupApi(dashboardApi);

  const factory = getESQLControlFactory();
  function buildApiMock(
    api: ControlApiRegistration<ESQLControlApi>,
    nextComparators: StateComparators<ESQLControlState>
  ) {
    return {
      ...api,
      uuid,
      parentApi: controlGroupApi,
      unsavedChanges: new BehaviorSubject<Partial<ESQLControlState> | undefined>(undefined),
      resetUnsavedChanges: () => {
        return true;
      },
      type: factory.type,
    };
  }

  test('Should add a new variable to the ES|QL service derived from state', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    await factory.buildControl(initialState, buildApiMock, uuid, controlGroupApi);
    expect(esqlVariablesService.getVariables().length).toBe(1);
    expect(esqlVariablesService.getVariables()[0].key).toBe('variable1');
  });

  test('Should get the serialized state correctly', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { api } = await factory.buildControl(initialState, buildApiMock, uuid, controlGroupApi);
    expect(api.serializeState()).toStrictEqual({
      rawState: {
        availableOptions: ['option1', 'option2'],
        controlType: 'STATIC_VALUES',
        esqlQuery: 'FROM foo | WHERE column = ?variable1',
        grow: undefined,
        selectedOptions: ['option1'],
        title: undefined,
        variableName: 'variable1',
        variableType: 'values',
        width: undefined,
      },
      references: [],
    });
  });

  test('calling the clear variables from the api should clear the variables from the ES|QL service', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { api } = await factory.buildControl(initialState, buildApiMock, uuid, controlGroupApi);
    expect(esqlVariablesService.getVariables().length).toBe(1);
    api.clearVariables();
    expect(esqlVariablesService.getVariables().length).toBe(0);
  });

  test('changing the dropdown should update the corresponding variable from the ES|QL service ', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { Component } = await factory.buildControl(
      initialState,
      buildApiMock,
      uuid,
      controlGroupApi
    );
    expect(esqlVariablesService.getVariables().length).toBe(1);
    expect(esqlVariablesService.getVariables()[0].value).toBe('option1');

    const { findByTestId, findByTitle } = render(<Component className="" />);
    fireEvent.click(await findByTestId('comboBoxSearchInput'));
    fireEvent.click(await findByTitle('option2'));

    await waitFor(() => {
      expect(esqlVariablesService.getVariables()[0].value).toBe('option2');
    });
  });
});
