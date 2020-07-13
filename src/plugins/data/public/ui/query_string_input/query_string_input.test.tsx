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
} from './query_string_input.test.mocks';

import { EuiTextArea } from '@elastic/eui';
import React from 'react';
import { QueryLanguageSwitcher } from './language_switcher';
import { QueryStringInput, QueryStringInputUI } from './query_string_input';
import { coreMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../mocks';
const startMock = coreMock.createStart();
import { stubIndexPatternWithFields } from '../../stubs';

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
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

function wrapQueryStringInputInContext(testProps: any, storage?: any) {
  const defaultOptions = {
    screenTitle: 'Another Screen',
    intl: null as any,
  };

  const services = {
    ...startMock,
    data: dataPluginMock.createStartContract(),
    appName: testProps.appName || 'test',
    storage: storage || createMockStorage(),
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryStringInput {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('QueryStringInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
      })
    );
    expect(component.find(EuiTextArea).props().value).toBe(kqlQuery.query);
    expect(component.find(QueryLanguageSwitcher).prop('language')).toBe(kqlQuery.language);
  });

  it('Should pass the query language to the language switcher', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
      })
    );
    expect(component.find(QueryLanguageSwitcher).prop('language')).toBe(luceneQuery.language);
  });

  it('Should disable autoFocus on EuiTextArea when disableAutoFocus prop is true', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
      })
    );
    expect(component.find(EuiTextArea).prop('autoFocus')).toBeFalsy();
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    mockPersistedLogFactory.mockClear();

    mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
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
      wrapQueryStringInputInContext(
        {
          query: kqlQuery,
          onSubmit: mockCallback,
          indexPatterns: [stubIndexPatternWithFields],
          disableAutoFocus: true,
          appName: 'discover',
        },
        mockStorage
      )
    );

    component.find(QueryLanguageSwitcher).props().onSelectLanguage('lucene');
    expect(mockStorage.set).toHaveBeenCalledWith('kibana.userQueryLanguage', 'lucene');
    expect(mockCallback).toHaveBeenCalledWith({ query: '', language: 'lucene' });
  });

  it('Should call onSubmit when the user hits enter inside the query bar', () => {
    const mockCallback = jest.fn();

    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: mockCallback,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
      })
    );

    const instance = component.find('QueryStringInputUI').instance() as QueryStringInputUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiTextArea).find('textarea');
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ query: 'response:200', language: 'kuery' });
  });

  it('Should use PersistedLog for recent search suggestions', async () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
        persistedLog: mockPersistedLog,
      })
    );

    const instance = component.find('QueryStringInputUI').instance() as QueryStringInputUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiTextArea).find('textarea');
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockPersistedLog.add).toHaveBeenCalledWith('response:200');

    mockPersistedLog.get.mockClear();
    inputWrapper.simulate('change', { target: { value: 'extensi' } });
    expect(mockPersistedLog.get).toHaveBeenCalled();
  });

  it('Should accept index pattern strings and fetch the full object', () => {
    mockFetchIndexPatterns.mockClear();
    mount(
      wrapQueryStringInputInContext({
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
