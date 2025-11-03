/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { coreMock } from '@kbn/core/public/mocks';
import { getColumns } from './get_columns';
import type { SearchSessionsConfigSchema } from '../../../../../../../server/config';
import { createSearchUsageCollectorMock } from '../../../../../collectors/mocks';
import { SessionsClient } from '../../../../sessions_client';
import { getUiSessionMock } from '../../../__mocks__';
import { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import type { UISession } from '../../../types';
import { render, screen } from '@testing-library/react';
import { SearchSessionStatus } from '../../../../../../../common';

const getColumn = (columns: Array<EuiBasicTableColumn<UISession>>, field: string) => {
  const column = columns.find((col) => 'field' in col && col.field === field);

  expect(column).toBeDefined();
  expect(column).toHaveProperty('render');

  return column as EuiTableFieldDataColumnType<UISession>;
};

const setup = ({
  kibanaVersion = '7.14.0',
  tz = 'UTC',
}: {
  kibanaVersion?: string;
  tz?: string;
} = {}) => {
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockConfig = {
    defaultExpiration: moment.duration('7d'),
    management: {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    },
  } as SearchSessionsConfigSchema;
  const sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
  const mockSearchUsageCollector = createSearchUsageCollectorMock();

  const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
    featureFlags: mockCoreStart.featureFlags,
  });

  const handleAction = jest.fn();

  return getColumns({
    core: mockCoreStart,
    api,
    config: mockConfig,
    timezone: tz,
    onActionComplete: handleAction,
    kibanaVersion,
    searchUsageCollector: mockSearchUsageCollector,
  });
};

describe('getColumns', () => {
  it.each([
    { field: 'appId', name: 'App', sortable: true },
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      width: '20%',
    },
    { field: 'numSearches', name: '# Searches', sortable: true },
    { field: 'status', name: 'Status', sortable: true },
    { field: 'created', name: 'Created', sortable: true },
    { field: 'expires', name: 'Expiration', sortable: true },
    { field: 'status', name: '', sortable: false },
    { field: 'actions', name: 'Actions', sortable: false },
  ])('returns the $field column', (expectedColumn) => {
    const columns = setup();
    expect(columns).toContainEqual(expect.objectContaining(expectedColumn));
  });

  describe.each([
    { columnName: 'name', expectedValue: 'Awesome Search Session' },
    { columnName: 'numSearches', expectedValue: '3' },
    { columnName: 'status', expectedValue: 'In progress' },
    { columnName: 'created', expectedValue: '1 Oct, 2023, 12:00:00' },
  ])('given the $columnName column', ({ columnName, expectedValue }) => {
    it(`should render the ${columnName}`, () => {
      // Given
      const mockSession = getUiSessionMock({
        name: 'Awesome Search Session',
        status: SearchSessionStatus.IN_PROGRESS,
        created: '2023-10-01T12:00:00Z',
        numSearches: 3,
      });

      const columns = setup();
      const column = getColumn(columns, columnName);

      // When
      render(column.render!(mockSession[columnName as keyof UISession], mockSession));

      // Then
      expect(screen.getByText(expectedValue)).toBeVisible();
    });
  });

  describe('given the status column', () => {
    describe('given an invalid status', () => {
      it('should render the status as is', () => {
        // Given
        const mockSession = getUiSessionMock({
          status: 'INVALID' as SearchSessionStatus,
        });

        const columns = setup();
        const statusColumn = getColumn(columns, 'status');

        // When
        render(statusColumn.render!(mockSession.status, mockSession));

        // Then
        expect(screen.getByText('INVALID')).toBeVisible();
      });
    });
  });

  describe('given the created column', () => {
    describe('when the timezone is set to Browser', () => {
      it('should render the date in the browser timezone', () => {
        // Given
        const mockSession = getUiSessionMock({
          created: '2020-12-02T00:19:32Z',
        });
        const tz = 'Browser';

        const columns = setup({ tz });
        const createdColumn = getColumn(columns, 'created');

        // When
        render(createdColumn.render!(mockSession.created, mockSession));

        // Then
        expect(screen.getByText('1 Dec, 2020, 19:19:32')).toBeVisible();
      });
    });

    describe('when the timezone is set to US/Alaska', () => {
      it('should render the date in the US/Alaska timezone', () => {
        // Given
        const mockSession = getUiSessionMock({
          created: '2020-12-02T00:19:32Z',
        });
        const tz = 'US/Alaska';

        const columns = setup({ tz });
        const createdColumn = getColumn(columns, 'created');

        // When
        render(createdColumn.render!(mockSession.created, mockSession));

        // Then
        expect(screen.getByText('1 Dec, 2020, 15:19:32')).toBeVisible();
      });
    });

    describe('when the date is invalid', () => {
      it('should render "Invalid date"', () => {
        // Given
        const mockSession = getUiSessionMock({
          created: 'INVALID',
        });

        const columns = setup();
        const createdColumn = getColumn(columns, 'created');

        // When
        render(createdColumn.render!(mockSession.created, mockSession));

        // Then
        expect(screen.getByText('Invalid date')).toBeVisible();
      });
    });
  });
});
