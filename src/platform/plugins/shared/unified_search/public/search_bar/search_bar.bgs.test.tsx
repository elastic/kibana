/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor } from '@testing-library/react';
import { QueryBarTopRow } from '../query_string_input/query_bar_top_row';
import SearchBar from './search_bar';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createMockStorage } from './mocks';
import { searchServiceMock } from '@kbn/data-plugin/public/search/mocks';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { BehaviorSubject } from 'rxjs';

const SAVED_SEARCH_NAME = 'Data discovery search';
const INITIAL_SESSION_ID = '12345';
const NEW_SESSION_ID = '67890';

jest.mock('../query_string_input/query_bar_top_row', () => ({
  QueryBarTopRow: jest.fn(() => <div />),
}));
const QueryBarTopRowMock = jest.mocked(QueryBarTopRow);

const setup = ({
  props,
}: {
  props?: Partial<React.ComponentProps<typeof SearchBar.WrappedComponent>>;
} = {}) => {
  const startMock = coreMock.createStart();

  const save = jest.fn().mockResolvedValue({
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: 'search-session',
    attributes: {
      name: SAVED_SEARCH_NAME,
      appId: 'my_app_id',
      locatorId: 'my_locator_id',
      idMapping: {},
      sessionId: 'session_id',
      created: new Date().toISOString(),
      expires: new Date().toISOString(),
      version: '8.0.0',
    },
    references: [],
  });

  const getSessionObservable = new BehaviorSubject<string | undefined>(undefined);

  const search = searchServiceMock.createStartContract({
    session: getSessionServiceMock({
      save,
      getSessionId: jest.fn().mockReturnValue(INITIAL_SESSION_ID),
      getSession$: jest.fn().mockReturnValue(getSessionObservable.asObservable()),
    }),
  });

  const finalServices = {
    ...startMock,
    storage: createMockStorage(),
    data: { query: {}, search },
    dataViewEditor: dataViewEditorPluginMock.createStartContract(),
    dataViews: {
      getIdsWithTitle: jest.fn(() => []),
    },
  };

  render(
    <EuiThemeProvider>
      <I18nProvider>
        <KibanaContextProvider services={finalServices}>
          <SearchBar.WrappedComponent intl={null as any} {...props} />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiThemeProvider>
  );

  return { save, addSuccess: startMock.notifications.toasts.addSuccess, getSessionObservable };
};

beforeEach(() => {
  QueryBarTopRowMock.mockReturnValue(<div />);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('<SearchBarUI />', () => {
  describe('when the query is NOT dirty', () => {
    const props = {
      showDatePicker: false,
      query: undefined,
      dateRangeFrom: 'now-15m',
      dateRangeTo: 'now',
    };

    describe('when a search is backgrounded', () => {
      it('should save the session', async () => {
        // When
        const { save } = setup({ props });
        QueryBarTopRowMock.mock.calls[0][0].onSendToBackground({ dateRange: { from: '', to: '' } });

        // Then
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
      });

      it('should add a toast', async () => {
        const { addSuccess } = setup({ props });
        QueryBarTopRowMock.mock.calls[0][0].onSendToBackground({ dateRange: { from: '', to: '' } });

        await waitFor(() => expect(addSuccess).toHaveBeenCalledTimes(1));
      });
    });
  });

  describe('when the query is dirty', () => {
    const props = {
      showDatePicker: false,
      query: undefined,
      dateRangeFrom: 'now-1h',
      dateRangeTo: 'now-15m',
    };

    describe('when a search is backgrounded', () => {
      it('should save the session', async () => {
        // When
        const { save, getSessionObservable } = setup({ props });
        QueryBarTopRowMock.mock.calls[0][0].onSendToBackground({ dateRange: { from: '', to: '' } });
        getSessionObservable.next(NEW_SESSION_ID); // simulate session being saved

        // Then
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
      });

      it('should add a toast', async () => {
        // When
        const { addSuccess, getSessionObservable } = setup({ props });
        QueryBarTopRowMock.mock.calls[0][0].onSendToBackground({ dateRange: { from: '', to: '' } });
        getSessionObservable.next(NEW_SESSION_ID); // simulate session being saved

        // Then
        await waitFor(() => expect(addSuccess).toHaveBeenCalledTimes(1));
      });
    });
  });
});
