/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

export const getActions = ({ find, form, component }: TestBed) => {
  /** Open the sort select drop down menu */
  const openSortSelect = () => {
    find('tableSortSelectBtn').at(0).simulate('click');
  };

  // --- Search Box ---

  /** Set the search box value */
  const updateSearchText = async (value: string) => {
    await act(async () => {
      find('tableListSearchBox').simulate('keyup', {
        key: 'Enter',
        target: { value },
      });
    });
    component.update();
  };

  /** Get the Search box value */
  const getSearchBoxValue = () => find('tableListSearchBox').props().defaultValue;

  // --- Row Actions ---
  const selectRow = (rowId: string) => {
    act(() => {
      form.selectCheckBox(`checkboxSelectRow-${rowId}`);
    });
    component.update();
  };

  const clickDeleteSelectedItemsButton = () => {
    act(() => {
      find('deleteSelectedItems').simulate('click');
    });
    component.update();
  };

  const clickConfirmModalButton = async () => {
    await act(async () => {
      find('confirmModalConfirmButton').simulate('click');
    });
    component.update();
  };

  return {
    openSortSelect,
    updateSearchText,
    getSearchBoxValue,
    selectRow,
    clickDeleteSelectedItemsButton,
    clickConfirmModalButton,
  };
};
