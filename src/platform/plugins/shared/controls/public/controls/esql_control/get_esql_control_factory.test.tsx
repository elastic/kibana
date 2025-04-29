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
import type { ESQLControlState } from '@kbn/esql/public';
import { getMockedControlGroupApi } from '../mocks/control_mocks';
import type { ControlApiRegistration } from '../types';
import { getESQLControlFactory } from './get_esql_control_factory';
import type { ESQLControlApi } from './types';

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
      unsavedChanges$: new BehaviorSubject<Partial<ESQLControlState> | undefined>(undefined),
      resetUnsavedChanges: () => {
        return true;
      },
      type: factory.type,
    };
  }

  test('Should publish ES|QL variable', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { api } = await factory.buildControl(initialState, buildApiMock, uuid, controlGroupApi);
    expect(api.esqlVariable$.value).toStrictEqual({
      key: 'variable1',
      type: 'values',
      value: 'option1',
    });
  });

  test('Should serialize state', async () => {
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

  test('changing the dropdown should publish new ES|QL variable', async () => {
    const initialState = {
      selectedOptions: ['option1'],
      availableOptions: ['option1', 'option2'],
      variableName: 'variable1',
      variableType: 'values',
      esqlQuery: 'FROM foo | WHERE column = ?variable1',
      controlType: 'STATIC_VALUES',
    } as ESQLControlState;
    const { Component, api } = await factory.buildControl(
      initialState,
      buildApiMock,
      uuid,
      controlGroupApi
    );

    expect(api.esqlVariable$.value).toStrictEqual({
      key: 'variable1',
      type: 'values',
      value: 'option1',
    });

    const { findByTestId, findByTitle } = render(<Component className="" />);
    fireEvent.click(await findByTestId('comboBoxSearchInput'));
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
