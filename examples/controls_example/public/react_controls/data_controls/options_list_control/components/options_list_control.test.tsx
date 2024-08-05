/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { render } from '@testing-library/react';
import { getOptionsListMocks } from '../../mocks/api_mocks';
import { ContextStateManager, OptionsListControlContext } from '../options_list_context_provider';
import { OptionsListComponentApi } from '../types';
import { OptionsListControl } from './options_list_control';

describe('Options list control', () => {
  const mountComponent = ({
    api,
    displaySettings,
    stateManager,
  }: {
    api: any;
    displaySettings: any;
    stateManager: any;
  }) => {
    return render(
      <OptionsListControlContext.Provider
        value={{
          api: api as unknown as OptionsListComponentApi,
          displaySettings,
          stateManager: stateManager as unknown as ContextStateManager,
        }}
      >
        <OptionsListControl controlPanelClassName="controlPanel" />
      </OptionsListControlContext.Provider>
    );
  };

  test('if exclude = false and existsSelected = true, then the option should read "Exists"', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.uuid = 'testExists';
    mocks.api.setExclude(false);
    mocks.setExistsSelected(true);
    const control = mountComponent(mocks);
    const existsOption = control.getByTestId('optionsList-control-testExists');
    expect(existsOption).toHaveTextContent('Exists');
  });

  test('if exclude = true and existsSelected = true, then the option should read "Does not exist"', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.uuid = 'testDoesNotExist';
    mocks.api.setExclude(true);
    mocks.setExistsSelected(true);
    const control = mountComponent(mocks);
    const existsOption = control.getByTestId('optionsList-control-testDoesNotExist');
    expect(existsOption).toHaveTextContent('DOES NOT Exist');
  });

  describe('renders proper delimiter', () => {
    test('keyword field', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.uuid = 'testDelimiter';
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 10 },
        { value: 'meow', docCount: 12 },
      ]);
      mocks.setSelectedOptions(['woof', 'bark']);
      mocks.api.field$.next({
        name: 'Test keyword field',
        type: 'keyword',
      } as DataViewField);
      const control = mountComponent(mocks);
      const selections = control.getByTestId('optionsListSelections');
      expect(selections.textContent).toBe('woof,  bark ');
    });
  });

  test('number field', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.uuid = 'testDelimiter';
    mocks.api.availableOptions$.next([
      { value: 1, docCount: 5 },
      { value: 2, docCount: 10 },
      { value: 3, docCount: 12 },
    ]);
    mocks.setSelectedOptions([1, 2]);
    mocks.api.field$.next({
      name: 'Test keyword field',
      type: 'number',
    } as DataViewField);
    const control = mountComponent(mocks);
    const selections = control.getByTestId('optionsListSelections');
    expect(selections.textContent).toBe('1;   2 ');
  });

  test('should display invalid state', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.uuid = 'testInvalid';
    mocks.api.availableOptions$.next([
      { value: 'woof', docCount: 5 },
      { value: 'bark', docCount: 10 },
      { value: 'meow', docCount: 12 },
    ]);
    mocks.setSelectedOptions(['woof', 'bark']);
    mocks.api.invalidSelections$.next(new Set(['woof']));
    mocks.api.field$.next({
      name: 'Test keyword field',
      type: 'number',
    } as DataViewField);

    const control = mountComponent(mocks);
    expect(
      control.queryByTestId('optionsList__invalidSelectionsToken-testInvalid')
    ).toBeInTheDocument();
  });
});
