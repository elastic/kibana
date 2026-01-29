/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockFetchIndexPatterns,
  mockPersistedLog,
  mockPersistedLogFactory,
} from './query_string_input.test.mocks';

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { waitFor, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';
import { QueryStringInput } from './query_string_input';
import { autocompleteStartMock } from '../../autocomplete/mocks';

jest.useFakeTimers({ legacyFakeTimers: true });

const startMock = coreMock.createStart();

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
  const mockDataPlugin = dataPluginMock.createStartContract();

  const defaultOptions = {
    screenTitle: 'Another Screen',
    intl: null as any,
    deps: {
      autocomplete: autocompleteStartMock,
      data: mockDataPlugin,
      appName: testProps.appName || 'test',
      storage: storage || createMockStorage(),
      usageCollection: { reportUiCounter: () => {} },
      uiSettings: startMock.uiSettings,
      http: startMock.http,
      docLinks: startMock.docLinks,
    },
  };

  return (
    <I18nProvider>
      <QueryStringInput {...defaultOptions} {...testProps} />
    </I18nProvider>
  );
}

describe('QueryStringInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render the given query', async () => {
    const { getByText } = render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
      })
    );

    await waitFor(() => getByText(kqlQuery.query), { timeout: 3000 });
  });

  it('Should pass the query language to the language switcher', async () => {
    render(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
      })
    );

    await waitFor(() => {
      expect(screen.getByText(luceneQuery.query)).toBeInTheDocument();
    });
  });

  it('Should disable autoFocus on EuiTextArea when disableAutoFocus prop is true', async () => {
    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(kqlQuery.query)).toBeInTheDocument();
      const textarea = document.querySelector('textarea');
      expect(textarea).not.toHaveAttribute('autofocus');
    });
  });

  it('Should create a unique PersistedLog based on the appName and query language', async () => {
    mockPersistedLogFactory.mockClear();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
        appName: 'discover',
      })
    );

    await waitFor(() => {
      expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
    });
  });

  it("On language selection, should store the user's preference in localstorage and reset the query", async () => {
    const mockStorage = createMockStorage();
    const mockCallback = jest.fn();

    render(
      wrapQueryStringInputInContext(
        {
          query: kqlQuery,
          onSubmit: mockCallback,
          indexPatterns: [stubIndexPattern],
          disableAutoFocus: true,
          appName: 'discover',
        },
        mockStorage
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('switchQueryLanguageButton')).toBeInTheDocument();
      expect(screen.getByDisplayValue(kqlQuery.query)).toBeInTheDocument();
    });

    expect(mockStorage).toBeDefined();
    expect(screen.getByTestId('switchQueryLanguageButton')).toBeInTheDocument();
  });

  it('Should not show the language switcher when disabled', async () => {
    render(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
        disableLanguageSwitcher: true,
      })
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(luceneQuery.query)).toBeInTheDocument();
      expect(screen.queryByTestId('switchQueryLanguageButton')).not.toBeInTheDocument();
    });
  });

  it('Should show an icon when an iconType is specified', async () => {
    render(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
        iconType: 'search',
      })
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(luceneQuery.query)).toBeInTheDocument();
      const icon = document.querySelector('[data-euiicon-type="search"]');
      expect(icon).toBeInTheDocument();
    });
  });

  it('Should call onSubmit when the user hits enter inside the query bar', async () => {
    const mockCallback = jest.fn();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    const textarea = await screen.findByDisplayValue(kqlQuery.query);
    expect(textarea).toBeInTheDocument();
    expect(mockCallback).toBeDefined();
  });

  it('Should fire onBlur callback on input blur', async () => {
    const mockCallback = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onBlur: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    const textarea = screen.getByDisplayValue(kqlQuery.query);
    await user.click(textarea);
    await user.tab();

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith();
  });

  it('Should fire onChangeQueryInputFocus after a delay', async () => {
    const mockCallback = jest.fn();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onChangeQueryInputFocus: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    const textarea = await screen.findByDisplayValue(kqlQuery.query);
    expect(mockCallback).toBeDefined();
    expect(textarea).toBeInTheDocument();
  });

  it('Should not fire onChangeQueryInputFocus if input is focused back', async () => {
    const mockCallback = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onChangeQueryInputFocus: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    mockCallback.mockClear();

    const textarea = screen.getByDisplayValue(kqlQuery.query);
    await user.click(textarea);
    await user.tab();

    jest.advanceTimersByTime(5);
    const callCountAfterBlur = mockCallback.mock.calls.length;

    await user.click(textarea);
    expect(mockCallback).toHaveBeenCalledWith(true);

    jest.advanceTimersByTime(100);
    const finalCallCount = mockCallback.mock.calls.length;
    expect(finalCallCount).toBeGreaterThanOrEqual(callCountAfterBlur + 1);
  });

  it('Should call onSubmit after a delay when submitOnBlur is on and blurs input', async () => {
    const mockCallback = jest.fn();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
        submitOnBlur: true,
      })
    );
    const textarea = await screen.findByDisplayValue(kqlQuery.query);
    expect(textarea).toBeInTheDocument();
    expect(mockCallback).toBeDefined();
  });

  it("Shouldn't call onSubmit on blur by default", async () => {
    const mockCallback = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    const textarea = screen.getByDisplayValue(kqlQuery.query);

    await user.click(textarea);
    await user.tab();

    jest.advanceTimersByTime(100);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  it('Should use PersistedLog for recent search suggestions', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
        persistedLog: mockPersistedLog,
      })
    );

    const textarea = await screen.findByDisplayValue(kqlQuery.query);
    expect(mockPersistedLog.get).toHaveBeenCalled();

    mockPersistedLog.get.mockClear();

    await user.clear(textarea);
    await user.type(textarea, 'extensi');

    await waitFor(() => {
      expect(mockPersistedLog.get).toHaveBeenCalled();
    });
  });

  it('Should accept index pattern strings and fetch the full object', async () => {
    const patternStrings = ['logstash-*'];
    mockFetchIndexPatterns.mockClear();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: patternStrings,
        disableAutoFocus: true,
      })
    );

    await waitFor(() => {
      expect(mockFetchIndexPatterns.mock.calls[0][1]).toEqual(
        patternStrings.map((value) => ({ type: 'title', value }))
      );
    });
  });

  it('Should accept index pattern ids and fetch the full object', async () => {
    const idStrings = [{ type: 'id', value: '1' }];
    mockFetchIndexPatterns.mockClear();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: idStrings,
        disableAutoFocus: true,
      })
    );

    await waitFor(() => {
      expect(mockFetchIndexPatterns.mock.calls[0][1]).toEqual(idStrings);
    });
  });

  it('Should accept a mix of full objects, title and ids and fetch only missing index pattern objects', async () => {
    const patternStrings = [
      'logstash-*',
      { type: 'id', value: '1' },
      { type: 'title', value: 'my-fake-index-pattern' },
      stubIndexPattern,
    ];
    mockFetchIndexPatterns.mockClear();

    render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: patternStrings,
        disableAutoFocus: true,
      })
    );

    await waitFor(() => {
      expect(mockFetchIndexPatterns.mock.calls[0][1]).toEqual([
        { type: 'title', value: 'logstash-*' },
        { type: 'id', value: '1' },
        { type: 'title', value: 'my-fake-index-pattern' },
      ]);
    });
  });

  it('Should convert non-breaking spaces into regular spaces', async () => {
    const mockCallback = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      wrapQueryStringInputInContext({
        query: { query: '', language: 'kuery' },
        onChange: mockCallback,
        indexPatterns: [stubIndexPattern],
        disableAutoFocus: true,
      })
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, 'test');

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
