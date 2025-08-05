/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, screen, waitFor, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { SessionsClient } from '../../../..';
import { SearchSessionStatus } from '../../../../../../common';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { LocaleWrapper } from '../../__mocks__';
import { SearchSessionsMgmtTable } from './table';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { createSearchUsageCollectorMock } from '../../../../collectors/mocks';

const setup = async ({
  mockSessionsFindResponse = {
    saved_objects: [],
    statuses: {},
  },
  refreshInterval = moment.duration(1, 'seconds'),
  refreshTimeout = moment.duration(10, 'minutes'),
  props = {},
}: {
  mockSessionsFindResponse?: any;
  refreshInterval?: moment.Duration;
  refreshTimeout?: moment.Duration;
  props?: Partial<React.ComponentProps<typeof SearchSessionsMgmtTable>>;
} = {}) => {
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockShareStart = sharePluginMock.createStartContract();

  const mockConfig = {
    defaultExpiration: moment.duration('7d'),
    management: {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval,
      refreshTimeout,
    },
  } as any;

  const mockSearchUsageCollector = createSearchUsageCollectorMock();

  const sessionsClient = new SessionsClient({
    http: mockCoreSetup.http,
  }) as jest.Mocked<SessionsClient>;
  sessionsClient.find = jest.fn().mockResolvedValue(mockSessionsFindResponse);

  const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
    locators: mockShareStart.url.locators,
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
  });

  let renderResult: RenderResult;
  await act(async () => {
    renderResult = render(
      <LocaleWrapper>
        <SearchSessionsMgmtTable
          core={mockCoreStart}
          api={api}
          timezone="UTC"
          config={mockConfig}
          kibanaVersion="8.0.0"
          searchUsageCollector={mockSearchUsageCollector}
          {...props}
        />
      </LocaleWrapper>
    );
  });

  return {
    sessionsClient,
    api,
    mockSearchUsageCollector,
    renderResult: renderResult!,
  };
};

describe('<SearchSessionsMgmtTable />', () => {
  const getInitialResponse = () => {
    return {
      saved_objects: [
        {
          id: 'wtywp9u2802hahgp-flps',
          attributes: {
            name: 'very background search',
            id: 'wtywp9u2802hahgp-flps',
            url: '/app/great-app-url/#48',
            appId: 'canvas',
            created: '2020-12-02T00:19:32Z',
            expires: '2020-12-07T00:19:32Z',
            idMapping: {},
          },
        },
      ],
      statuses: {
        'wtywp9u2802hahgp-flps': { status: SearchSessionStatus.EXPIRED },
      },
    };
  };

  it('should render table header cells', async () => {
    await setup({ mockSessionsFindResponse: getInitialResponse() });

    // Check header cells (column titles)
    expect(screen.getByRole('columnheader', { name: 'App' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '# Searches' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Created' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Expiration' })).toBeInTheDocument();
  });

  it('should render table body cells', async () => {
    await setup({ mockSessionsFindResponse: getInitialResponse() });

    // Check cell contents
    await waitFor(() => {
      expect(screen.getByText('very background search')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText('2 Dec, 2020, 00:19:32')).toBeInTheDocument();
      expect(screen.getByText('--')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('when the columns are filtered', () => {
    it('should render table header cells', async () => {
      await setup({
        mockSessionsFindResponse: getInitialResponse(),
        props: { columns: ['appId', 'name'] },
      });

      // Check header cells (column titles)
      expect(screen.getByRole('columnheader', { name: 'App' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: '# Searches' })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Created' })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Expiration' })).not.toBeInTheDocument();
    });
  });

  it('re-fetches data', async () => {
    jest.useFakeTimers();

    const { sessionsClient } = await setup();

    // Allow initial fetch to complete
    await waitFor(() => expect(sessionsClient.find).toHaveBeenCalledTimes(1));

    // Fast-forward timer to trigger the refresh
    act(() => {
      jest.advanceTimersByTime(1000); // Advance by 1 second (refresh interval)
    });

    // Verify that the find method was called again
    await waitFor(() => expect(sessionsClient.find).toHaveBeenCalledTimes(2));

    jest.useRealTimers();
  });

  describe('when the refresh button is clicked', () => {
    it('uses the session client', async () => {
      const user = userEvent.setup();

      const { sessionsClient } = await setup({
        refreshInterval: moment.duration(1, 'day'),
        refreshTimeout: moment.duration(2, 'days'),
      });

      // Wait for initial load to complete
      await waitFor(() => expect(sessionsClient.find).toHaveBeenCalledTimes(1));

      // Click the refresh button
      const refreshButton = screen.getByTestId('sessionManagementRefreshBtn');
      await user.click(refreshButton);

      // Verify the find method was called again
      await waitFor(() => expect(sessionsClient.find).toHaveBeenCalledTimes(2));
    });
  });
});
