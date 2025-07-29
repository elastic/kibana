/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import moment from 'moment';
import { SearchSessionStatus } from '../../../../../../common';
import { createSearchUsageCollectorMock } from '../../../../collectors/mocks';
import { SearchSessionsMgmtTable } from './table';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { SessionsClient } from '../../../sessions_client';
import { getUiSessionMocks } from '../../__mocks__';
import { UISession } from '../../types';
import { ACTION } from '../actions';

export default {
  title: 'components/SearchSessionsMgmtTable',
};

const Component = ({
  data = getUiSessionMocks({ length: 5 }),
  props = {},
}: {
  data?: UISession[];
  props?: Partial<typeof SearchSessionsMgmtTable>;
}) => {
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockShareStart = sharePluginMock.createStartContract();

  const sessionsClient = new SessionsClient({
    http: mockCoreSetup.http,
  });

  const mockConfig = {
    defaultExpiration: moment.duration('7d'),
    management: {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    },
  } as any;

  const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
    locators: mockShareStart.url.locators,
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
  });
  api.fetchTableData = async () => {
    return data;
  };

  const mockSearchUsageCollector = createSearchUsageCollectorMock();

  return (
    <IntlProvider>
      <SearchSessionsMgmtTable
        core={mockCoreStart}
        api={api}
        timezone="UTC"
        config={mockConfig}
        kibanaVersion="8.0.0"
        searchUsageCollector={mockSearchUsageCollector}
        {...props}
      />
    </IntlProvider>
  );
};

export const Default = {
  name: 'Default',
  render: () => <Component />,
};

export const WithActions = {
  name: 'With actions',
  render: () => (
    <Component
      data={getUiSessionMocks({
        length: 5,
        overrides: () => ({
          actions: [ACTION.INSPECT, ACTION.DELETE, ACTION.EXTEND, ACTION.RENAME],
        }),
      })}
    />
  ),
};

export const NoData = {
  name: 'No data',
  render: () => <Component data={[]} />,
};

export const MultiplePages = {
  name: 'Multiple pages',
  render: () => <Component data={getUiSessionMocks({ length: 500 })} />,
};

export const DifferentApps = {
  name: 'Different apps',
  render: () => (
    <Component
      data={getUiSessionMocks({
        length: 50,
        overrides: ({ idx }) => {
          const apps = ['discover', 'dashboard', 'visualize', 'canvas', 'ml', 'graph'];

          return {
            appId: apps[idx % apps.length],
          };
        },
      })}
    />
  ),
};

export const DifferentSearchCounts = {
  name: 'Different search counts',
  render: () => (
    <Component
      data={getUiSessionMocks({
        length: 50,
        overrides: ({ idx }) => {
          return {
            numSearches: idx,
          };
        },
      })}
    />
  ),
};

export const DifferentStatuses = {
  name: 'Different statuses',
  render: () => (
    <Component
      data={getUiSessionMocks({
        length: 50,
        overrides: ({ idx }) => {
          const statuses = [
            SearchSessionStatus.CANCELLED,
            SearchSessionStatus.COMPLETE,
            SearchSessionStatus.ERROR,
            SearchSessionStatus.EXPIRED,
            SearchSessionStatus.IN_PROGRESS,
          ];

          return {
            status: statuses[idx % statuses.length],
          };
        },
      })}
    />
  ),
};

export const FilteredColumns = {
  name: 'Filtered columns',
  render: () => <Component props={{ columns: ['name', 'status'] }} />,
};
