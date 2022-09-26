/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { SearchBar } from './search_bar';

describe('SearchBar', () => {
  it('it does not display add exception button if user is read only', () => {
    const wrapper = render(
      <SearchBar
        listType={ExceptionListTypeEnum.DETECTION}
        onSearch={jest.fn()}
        onAddExceptionClick={jest.fn()}
        isSearching={false}
        canAddException
        buttonDataTestSubj="searchBarAddExceptionBtn"
      />
    );

    expect(wrapper.queryByTestId('searchBarAddExceptionBtn')).not.toBeInTheDocument();
  });

  it('it invokes "onAddExceptionClick" when user selects to add an exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = render(
      <SearchBar
        canAddException={false}
        listType={ExceptionListTypeEnum.DETECTION}
        isSearching={false}
        onSearch={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
        buttonDataTestSubj="searchBarAddExceptionBtn"
        searchBarDataTestSubj="searchBar"
        addExceptionButtonText="Add rule exception"
      />
    );

    const searchBtn = wrapper.getByTestId('searchBarAddExceptionBtn');

    fireEvent.click(searchBtn);
    expect(searchBtn).toHaveTextContent('Add rule exception');
    expect(mockOnAddExceptionClick).toHaveBeenCalledWith('detection');
  });

  it('it invokes "onAddExceptionClick" when user selects to add an endpoint exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = render(
      <SearchBar
        canAddException={false}
        listType={ExceptionListTypeEnum.ENDPOINT}
        isSearching={false}
        onSearch={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
        buttonDataTestSubj="searchBarAddExceptionBtn"
        searchBarDataTestSubj="searchBar"
        addExceptionButtonText="Add endpoint exception"
      />
    );

    const searchBtn = wrapper.getByTestId('searchBarAddExceptionBtn');

    fireEvent.click(searchBtn);
    expect(searchBtn).toHaveTextContent('Add endpoint exception');
    expect(mockOnAddExceptionClick).toHaveBeenCalledWith('endpoint');
  });
  it('it invokes the "handlOnSearch" when the user add search query', () => {
    const mockHandleOnSearch = jest.fn();
    const wrapper = render(
      <SearchBar
        canAddException={false}
        listType={ExceptionListTypeEnum.ENDPOINT}
        isSearching={false}
        onSearch={mockHandleOnSearch}
        onAddExceptionClick={jest.fn()}
        buttonDataTestSubj="searchBarAddExceptionBtn"
        searchBarDataTestSubj="searchBar"
        addExceptionButtonText="Add endpoint exception"
      />
    );

    const searchInput = wrapper.getByTestId('searchBar');
    fireEvent.change(searchInput, { target: { value: 'query' } });
    expect(mockHandleOnSearch).toBeCalledWith({ search: 'query' });
  });
});
