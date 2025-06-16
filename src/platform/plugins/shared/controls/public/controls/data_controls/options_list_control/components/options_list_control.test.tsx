/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { render } from '@testing-library/react';
import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { OptionsListControlContext } from '../options_list_context_provider';
import { OptionsListComponentApi } from '../types';
import { OptionsListControl } from './options_list_control';
import { OptionsListDisplaySettings } from '../../../../../common/options_list';

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
        <OptionsListControl controlPanelClassName="controlPanel" />
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
      expect(selections.textContent).toBe('woof,  bark ');
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
    expect(selections.textContent).toBe('1;   2 ');
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
});
