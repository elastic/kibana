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
  mockFetchIndexPatterns,
  mockPersistedLog,
  mockPersistedLogFactory,
} from './query_bar_input.test.mocks';

import { EuiFieldText } from '@elastic/eui';
import React from 'react';
import { QueryLanguageSwitcher } from './language_switcher';
import { QueryBarInput, QueryBarInputUI } from './query_bar_input';
import { coreMock } from '../../../../../../../core/public/mocks';
const startMock = coreMock.createStart();
import { IndexPattern } from '../../../index';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { I18nProvider } from '@kbn/i18n/react';
import { mount } from 'enzyme';

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
} as IndexPattern;

function wrapQueryBarInputInContext(testProps: any, store?: any) {
  const defaultOptions = {
    screenTitle: 'Another Screen',
    intl: null as any,
  };

  const services = {
    appName: 'test',
    uiSettings: startMock.uiSettings,
    savedObjects: startMock.savedObjects,
    notifications: startMock.notifications,
    http: startMock.http,
    store: store || createMockStorage(),
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryBarInput {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('QueryBarInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', () => {
    const component = mount(
      wrapQueryBarInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [mockIndexPattern],
      })
    );

    expect(component).toMatchSnapshot();
  });

  it('Should pass the query language to the language switcher', () => {
    const component = mount(
      wrapQueryBarInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [mockIndexPattern],
      })
    );

    expect(component).toMatchSnapshot();
  });

  it('Should disable autoFocus on EuiFieldText when disableAutoFocus prop is true', () => {
    const component = mount(
      wrapQueryBarInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [mockIndexPattern],
        disableAutoFocus: true,
      })
    );

    expect(component).toMatchSnapshot();
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    mockPersistedLogFactory.mockClear();

    mount(
      wrapQueryBarInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [mockIndexPattern],
        disableAutoFocus: true,
        appName: 'discover',
      })
    );
    expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
  });

  it("On language selection, should store the user's preference in localstorage and reset the query", () => {
    const mockStorage = createMockStorage();
    const mockCallback = jest.fn();
    const component = mount(
      wrapQueryBarInputInContext(
        {
          query: kqlQuery,
          onSubmit: mockCallback,
          indexPatterns: [mockIndexPattern],
          disableAutoFocus: true,
          appName: 'discover',
        },
        mockStorage
      )
    );

    component
      .find(QueryLanguageSwitcher)
      .props()
      .onSelectLanguage('lucene');
    expect(mockStorage.set).toHaveBeenCalledWith('kibana.userQueryLanguage', 'lucene');
    expect(mockCallback).toHaveBeenCalledWith({ query: '', language: 'lucene' });
  });

  it('Should call onSubmit when the user hits enter inside the query bar', () => {
    const mockCallback = jest.fn();

    const component = mount(
      wrapQueryBarInputInContext({
        query: kqlQuery,
        onSubmit: mockCallback,
        indexPatterns: [mockIndexPattern],
        disableAutoFocus: true,
      })
    );

    const instance = component.find('QueryBarInputUI').instance() as QueryBarInputUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiFieldText).find('input');
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ query: 'response:200', language: 'kuery' });
  });

  it('Should use PersistedLog for recent search suggestions', async () => {
    const component = mount(
      wrapQueryBarInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [mockIndexPattern],
        disableAutoFocus: true,
        persistedLog: mockPersistedLog,
      })
    );

    const instance = component.find('QueryBarInputUI').instance() as QueryBarInputUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiFieldText).find('input');
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockPersistedLog.add).toHaveBeenCalledWith('response:200');

    mockPersistedLog.get.mockClear();
    inputWrapper.simulate('change', { target: { value: 'extensi' } });
    expect(mockPersistedLog.get).toHaveBeenCalled();
  });

  it('Should accept index pattern strings and fetch the full object', () => {
    mockFetchIndexPatterns.mockClear();
    mount(
      wrapQueryBarInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: ['logstash-*'],
        disableAutoFocus: true,
      })
    );

    expect(mockFetchIndexPatterns).toHaveBeenCalledWith(
      startMock.savedObjects.client,
      ['logstash-*'],
      startMock.uiSettings
    );
  });
});
