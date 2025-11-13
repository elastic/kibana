/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RenderResult } from '@testing-library/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { SessionsClient } from '../../../..';
import { SearchSessionStatus } from '../../../../../../common';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { LocaleWrapper } from '../../__mocks__';
import type { GetColumnsFn } from './table';
import { SearchSessionsMgmtTable } from './table';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { createSearchUsageCollectorMock } from '../../../../collectors/mocks';
import type { UISession } from '../../types';
import { getSearchSessionEBTManagerMock } from '../../../mocks';

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
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
    featureFlags: mockCoreStart.featureFlags,
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
          locators={mockShareStart.url.locators}
          searchUsageCollector={mockSearchUsageCollector}
          searchSessionEBTManager={getSearchSessionEBTManagerMock()}
          trackingProps={{ renderedIn: 'test', openedFrom: 'test' }}
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

  describe('when no columns function is provided', () => {
    it('should render the default table header cells', async () => {
      await setup({ mockSessionsFindResponse: getInitialResponse() });

      // Check header cells (column titles)
      expect(screen.getByRole('columnheader', { name: 'App' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: '# Searches' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Created' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Expiration' })).toBeInTheDocument();
    });

    it('should render the default table body cells', async () => {
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
  });

  describe('when a columns function is provided', () => {
    const getColumns: GetColumnsFn = () => [
      { field: 'appId', name: 'App', render: () => null },
      { field: 'name', name: 'Name', render: (name: UISession['name']) => <div>{name}</div> },
    ];

    it('should render table header cells', async () => {
      await setup({
        mockSessionsFindResponse: getInitialResponse(),
        props: {
          getColumns,
        },
      });

      // Check header cells (column titles)
      expect(screen.getByRole('columnheader', { name: 'App' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: '# Searches' })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Created' })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Expiration' })).not.toBeInTheDocument();
    });

    it('should render the table body cells', async () => {
      await setup({
        mockSessionsFindResponse: getInitialResponse(),
        props: {
          getColumns,
        },
      });

      // Check cell contents
      await waitFor(() => {
        expect(screen.getByText('very background search')).toBeInTheDocument();
        expect(screen.queryByText('Expired')).not.toBeInTheDocument();
        expect(screen.queryByText('2 Dec, 2020, 00:19:32')).not.toBeInTheDocument();
        expect(screen.queryByText('--')).not.toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    describe('when the app column is present', () => {
      it('should render the app filter', async () => {
        // Given
        const getColumnsWithApp: GetColumnsFn = () => [
          { field: 'appId', name: 'App', render: () => <div>App id column</div> },
          { field: 'name', name: 'Name', render: (name: UISession['name']) => <div>{name}</div> },
        ];

        // When
        await setup({
          mockSessionsFindResponse: getInitialResponse(),
          props: {
            getColumns: getColumnsWithApp,
          },
        });

        // Then
        expect(screen.getByLabelText('App Selection')).toBeInTheDocument();
      });
    });

    describe('when the app column is NOT present', () => {
      it('should NOT render the app filter', async () => {
        // Given
        const getColumnsWithApp: GetColumnsFn = () => [
          { field: 'name', name: 'Name', render: (name: UISession['name']) => <div>{name}</div> },
        ];

        // When
        await setup({
          mockSessionsFindResponse: getInitialResponse(),
          props: {
            getColumns: getColumnsWithApp,
          },
        });

        // Then
        expect(screen.queryByLabelText('App Selection')).not.toBeInTheDocument();
      });
    });

    describe('when the status column is present', () => {
      it('should render the status filter', async () => {
        // Given
        const getColumnsWithStatus: GetColumnsFn = () => [
          { field: 'appId', name: 'App', render: () => <div>App id column</div> },
          { field: 'name', name: 'Name', render: (name: UISession['name']) => <div>{name}</div> },
          { field: 'status', name: 'Status', render: () => <div>Status column</div> },
        ];

        // When
        await setup({
          mockSessionsFindResponse: getInitialResponse(),
          props: {
            getColumns: getColumnsWithStatus,
          },
        });

        // Then
        expect(screen.getByLabelText('Status Selection')).toBeInTheDocument();
      });
    });

    describe('when the status column is NOT present', () => {
      it('should NOT render the status filter', async () => {
        // Given
        const getColumnsWithStatus: GetColumnsFn = () => [
          { field: 'appId', name: 'App', render: () => <div>App id column</div> },
          { field: 'name', name: 'Name', render: (name: UISession['name']) => <div>{name}</div> },
        ];

        // When
        await setup({
          mockSessionsFindResponse: getInitialResponse(),
          props: {
            getColumns: getColumnsWithStatus,
          },
        });

        // Then
        expect(screen.queryByLabelText('Status Selection')).not.toBeInTheDocument();
      });
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

  describe('when hideRefreshButton is false', () => {
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

  describe('when hideRefreshButton is true', () => {
    it('does not render the refresh button', async () => {
      await setup({
        props: {
          hideRefreshButton: true,
        },
      });

      // Verify that the refresh button is not in the document
      expect(screen.queryByTestId('sessionManagementRefreshBtn')).not.toBeInTheDocument();
    });
  });
});
