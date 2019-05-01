/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  mockGetAutocompleteProvider,
  mockGetAutocompleteSuggestions,
  mockPersistedLog,
  mockPersistedLogFactory,
} from './query_bar.test.mocks';

import { EuiFieldText } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { QueryBar } from './query_bar';
import { QueryLanguageSwitcher } from './language_switcher';
import { QueryBarUI } from './query_bar';

const noop = () => {
  return;
};

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const luceneQuery = {
  query: 'response:200',
  language: 'lucene',
};

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  store: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

const mockIndexPattern = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
};

describe('QueryBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', () => {
    const component = shallowWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        intl={null as any}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should pass the query language to the language switcher', () => {
    const component = shallowWithIntl(
      <QueryBar.WrappedComponent
        query={luceneQuery}
        onSubmit={noop}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        intl={null as any}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should disable autoFocus on EuiFieldText when disableAutoFocus prop is true', () => {
    const component = shallowWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
        intl={null as any}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    shallowWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
        intl={null as any}
      />
    );

    expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
  });

  it("On language selection, should store the user's preference in localstorage and reset the query", () => {
    const mockStorage = createMockStorage();
    const mockCallback = jest.fn();

    const component = mountWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={mockCallback}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={mockStorage}
        disableAutoFocus={true}
        intl={null as any}
      />
    );

    component
      .find(QueryLanguageSwitcher)
      .props()
      .onSelectLanguage('lucene');
    expect(mockStorage.set).toHaveBeenCalledWith('kibana.userQueryLanguage', 'lucene');
    expect(mockCallback).toHaveBeenCalledWith({
      dateRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        query: '',
        language: 'lucene',
      },
    });
  });

  it('Should call onSubmit with the current query when the user hits enter inside the query bar', () => {
    const mockCallback = jest.fn();

    const component = mountWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={mockCallback}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
        intl={null as any}
      />
    );

    const instance = component.instance() as QueryBarUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiFieldText).find('input');
    inputWrapper.simulate('change', { target: { value: 'extension:jpg' } });
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      dateRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        query: 'extension:jpg',
        language: 'kuery',
      },
    });
  });

  it('Should use PersistedLog for recent search suggestions', async () => {
    const component = mountWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
        intl={null as any}
      />
    );

    const instance = component.instance() as QueryBarUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiFieldText).find('input');
    inputWrapper.simulate('change', { target: { value: 'extension:jpg' } });
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockPersistedLog.add).toHaveBeenCalledWith('extension:jpg');

    mockPersistedLog.get.mockClear();
    inputWrapper.simulate('change', { target: { value: 'extensi' } });
    expect(mockPersistedLog.get).toHaveBeenCalledTimes(1);
  });

  it('Should get suggestions from the autocomplete provider for the current language', () => {
    mountWithIntl(
      <QueryBar.WrappedComponent
        query={kqlQuery}
        onSubmit={noop}
        appName={'discover'}
        screenTitle={'Another Screen'}
        indexPatterns={[mockIndexPattern]}
        store={createMockStorage()}
        disableAutoFocus={true}
        intl={null as any}
      />
    );

    expect(mockGetAutocompleteProvider).toHaveBeenCalledWith('kuery');
    expect(mockGetAutocompleteSuggestions).toHaveBeenCalled();
  });
});
