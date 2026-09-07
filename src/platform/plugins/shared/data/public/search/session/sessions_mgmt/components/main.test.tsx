/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { SessionsClient } from '../../..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { LocaleWrapper } from '../__mocks__';
import { SearchSessionsMgmtMain } from './main';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { createSearchUsageCollectorMock } from '../../../collectors/mocks';
import { getSearchSessionEBTManagerMock } from '../../mocks';

const setup = async () => {
  const mockCoreSetup = coreMock.createSetup();
  mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
    return key === 'dateFormat:tz' ? 'UTC' : null;
  });

  const mockCoreStart = coreMock.createStart() as unknown as CoreStart;

  const mockShareStart = sharePluginMock.createStartContract();
  const mockSearchUsageCollector = createSearchUsageCollectorMock();
  const mockConfig = {
    defaultExpiration: moment.duration('7d'),
    management: {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    },
  } as any;

  const sessionsClient = new SessionsClient({
    http: mockCoreSetup.http,
  }) as jest.Mocked<SessionsClient>;
  sessionsClient.find = jest.fn().mockResolvedValue({
    saved_objects: [],
    statuses: {},
  });

  const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
    featureFlags: mockCoreStart.featureFlags,
  });

  await act(async () => {
    render(
      <LocaleWrapper>
        <MockAppHeaderProvider>
          <SearchSessionsMgmtMain
            core={mockCoreStart}
            api={api}
            http={mockCoreSetup.http}
            timezone="UTC"
            config={mockConfig}
            kibanaVersion={'8.0.0'}
            searchUsageCollector={mockSearchUsageCollector}
            share={mockShareStart}
            searchSessionEBTManager={getSearchSessionEBTManagerMock()}
          />
        </MockAppHeaderProvider>
      </LocaleWrapper>
    );
  });

  return {
    api,
    mockCoreStart,
    mockCoreSetup,
    mockSearchUsageCollector,
    sessionsClient,
  };
};

describe('<SearchSessionsMgmtMain />', () => {
  describe.each([{ expectedName: 'Background Search' }])(
    'when background search is $backgroundSearchEnabled',
    ({ expectedName }) => {
      it('should render the page title', async () => {
        await setup();
        expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(expectedName);
      });

      it('should render the table', async () => {
        await setup();

        const table = screen.getByTestId('searchSessionsMgmtUiTable');
        expect(table).toBeVisible();
      });
    }
  );

  it('renders Refresh as the AppHeader primary action', async () => {
    await setup();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Manage your background searches.'
    );

    await waitFor(() => {
      expect(screen.getByTestId('sessionManagementRefreshBtn')).toBeInTheDocument();
    });

    expect(screen.getAllByTestId('sessionManagementRefreshBtn')).toHaveLength(1);
  });

  it('refreshes sessions when the AppHeader primary action is clicked', async () => {
    const user = userEvent.setup();
    const { sessionsClient } = await setup();

    await waitFor(() => expect(sessionsClient.find).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByTestId('sessionManagementRefreshBtn')).toBeEnabled();
    });

    await user.click(screen.getByTestId('sessionManagementRefreshBtn'));

    await waitFor(() => expect(sessionsClient.find).toHaveBeenCalledTimes(2));
  });

  describe('when background search is true', () => {
    it('should NOT render the documentation link', async () => {
      await setup();

      const docLink = screen.queryByText('Documentation');
      expect(docLink).not.toBeInTheDocument();
    });
  });
});
