/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { OptionsListDisplaySettings } from '@kbn/controls-schemas';

import { render } from '@testing-library/react';
import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListControl } from './options_list_control';

let httpPostMock: jest.Mock;
jest.mock('../../../../services/kibana_services', () => {
  httpPostMock = jest.fn();
  return {
    coreServices: {
      http: {
        post: (...args: unknown[]) => httpPostMock(...args),
      },
    },
  };
});

describe('Options list control', () => {
  const mountComponent = ({
    componentApi,
    displaySettings,
  }: {
    componentApi: OptionsListComponentApi;
    displaySettings: OptionsListDisplaySettings;
  }) => {
    return render(
      <OptionsListControlContext.Provider
        value={{
          componentApi,
          displaySettings,
        }}
      >
        <OptionsListControl />
      </OptionsListControlContext.Provider>
    );
  };

  test('if exclude = false and existsSelected = true, then the option should read "Exists"', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.uuid = 'testExists';
    contextMock.componentApi.setExclude(false);
    contextMock.componentApi.setExistsSelected(true);
    const control = mountComponent(contextMock);
    const existsOption = control.getByTestId('optionsList-control-testExists');
    expect(existsOption).toHaveTextContent('Exists');
  });

  test('if exclude = true and existsSelected = true, then the option should read "Does not exist"', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.uuid = 'testDoesNotExist';
    contextMock.componentApi.setExclude(true);
    contextMock.componentApi.setExistsSelected(true);
    const control = mountComponent(contextMock);
    const existsOption = control.getByTestId('optionsList-control-testDoesNotExist');
    expect(existsOption).toHaveTextContent('DOES NOT Exist');
  });

  describe('renders proper delimiter', () => {
    test('keyword field', async () => {
      const contextMock = getOptionsListContextMock();
      contextMock.componentApi.uuid = 'testDelimiter';
      contextMock.componentApi.setAvailableOptions([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 10 },
        { value: 'meow', docCount: 12 },
      ]);
      contextMock.componentApi.setSelectedOptions(['woof', 'bark']);
      contextMock.testOnlyMethods.setField({
        name: 'Test keyword field',
        type: 'keyword',
      } as DataViewField);
      const control = mountComponent(contextMock);
      const selections = control.getByTestId('optionsListSelections');
      expect(selections.textContent).toBe('woof, bark');
    });
  });

  test('number field', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.uuid = 'testDelimiter';
    contextMock.componentApi.setAvailableOptions([
      { value: 1, docCount: 5 },
      { value: 2, docCount: 10 },
      { value: 3, docCount: 12 },
    ]);
    contextMock.componentApi.setSelectedOptions([1, 2]);
    contextMock.testOnlyMethods.setField({
      name: 'Test keyword field',
      type: 'number',
    } as DataViewField);
    const control = mountComponent(contextMock);
    const selections = control.getByTestId('optionsListSelections');
    expect(selections.textContent).toBe('1;  2');
  });

  test('should display invalid state', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.uuid = 'testInvalid';
    contextMock.componentApi.setAvailableOptions([
      { value: 'woof', docCount: 5 },
      { value: 'bark', docCount: 10 },
      { value: 'meow', docCount: 12 },
    ]);
    contextMock.componentApi.setSelectedOptions(['woof', 'bark']);
    contextMock.componentApi.setInvalidSelections(new Set(['woof']));
    contextMock.testOnlyMethods.setField({
      name: 'Test keyword field',
      type: 'number',
    } as DataViewField);

    const control = mountComponent(contextMock);
    expect(
      control.queryByTestId('optionsList__invalidSelectionsToken-testInvalid')
    ).toBeInTheDocument();
  });

  test('assignee field renders avatar stack instead of raw ids', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.uuid = 'testAssignees';
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setSelectedOptions(['uid-1', 'uid-2']);

    httpPostMock.mockResolvedValueOnce([
      {
        uid: 'uid-1',
        enabled: true,
        user: { username: 'user1', full_name: 'User One' },
        data: { avatar: {} },
      },
      {
        uid: 'uid-2',
        enabled: true,
        user: { username: 'user2', full_name: 'User Two' },
        data: { avatar: {} },
      },
    ]);

    const control = mountComponent(contextMock);
    expect(control.getByTestId('optionsListAssigneeAvatars')).toBeInTheDocument();
    // We no longer render the raw IDs in the collapsed selection preview.
    expect(control.queryByText('uid-1')).not.toBeInTheDocument();
    expect(control.queryByText('uid-2')).not.toBeInTheDocument();
  });

  test('assignee field shows a dedicated avatar for \"No assignees\" selection', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.uuid = 'testNoAssignees';
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setSelectedOptions(['__options_list_no_assignees__']);

    const control = mountComponent(contextMock);
    expect(control.getByTestId('optionsListNoAssigneesAvatar')).toBeInTheDocument();
  });
});
