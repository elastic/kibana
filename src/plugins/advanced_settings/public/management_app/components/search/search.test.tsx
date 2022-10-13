/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider, mountWithI18nProvider } from '@kbn/test-jest-helpers';

import { findTestSubject } from '@elastic/eui/lib/test';

import { Query } from '@elastic/eui';
import { Search } from './search';

const query = Query.parse('');
const categories = ['general', 'dashboard', 'hiddenCategory', 'x-pack'];

describe('Search', () => {
  it('should render normally', async () => {
    const onQueryChange = () => {};
    const component = shallowWithI18nProvider(
      <Search query={query} categories={categories} onQueryChange={onQueryChange} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should call parent function when query is changed', async () => {
    // This test is brittle as it knows about implementation details
    // (EuiFieldSearch uses onKeyup instead of onChange to handle input)
    const onQueryChange = jest.fn();
    const component = mountWithI18nProvider(
      <Search query={query} categories={categories} onQueryChange={onQueryChange} />
    );
    findTestSubject(component, 'settingsSearchBar').simulate('keyup', {
      target: { value: 'new filter' },
    });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('should handle query parse error', async () => {
    const onQueryChangeMock = jest.fn();
    const component = mountWithI18nProvider(
      <Search query={query} categories={categories} onQueryChange={onQueryChangeMock} />
    );

    const searchBar = findTestSubject(component, 'settingsSearchBar');

    // Send invalid query
    searchBar.simulate('keyup', { target: { value: '?' } });
    expect(onQueryChangeMock).toHaveBeenCalledTimes(0);
    expect(component.state().isSearchTextValid).toBe(false);

    onQueryChangeMock.mockReset();

    // Send valid query to ensure component can recover from invalid query
    searchBar.simulate('keyup', { target: { value: 'dateFormat' } });
    expect(onQueryChangeMock).toHaveBeenCalledTimes(1);
    expect(component.state().isSearchTextValid).toBe(true);
  });
});
