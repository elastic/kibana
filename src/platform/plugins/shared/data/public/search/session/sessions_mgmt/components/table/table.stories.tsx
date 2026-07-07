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
import type { SearchSessionStatusResponse } from '../../../../../../common';
import { SearchSessionStatus } from '../../../../../../common';
import { createSearchUsageCollectorMock } from '../../../../collectors/mocks';
import { SearchSessionsMgmtTable } from './table';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { SessionsClient } from '../../../sessions_client';
import { getSearchSessionSavedObjectMocks } from '../../__mocks__';
import type { SearchSessionSavedObject } from '../../types';
import { ACTION } from '../../types';
import { getPersistedSearchSessionSavedObjectAttributesMock } from '../../../mocks';
import { columns } from '.';
import { SearchSessionEBTManager } from '../../../ebt_manager';

export default {
  title: 'components/SearchSessionsMgmtTable',
};

type GetColumnsParams = Parameters<
  NonNullable<React.ComponentProps<typeof SearchSessionsMgmtTable>['getColumns']>
>[0];

const Component = ({
  data = getSearchSessionSavedObjectMocks({ length: 5 }),
  statuses = {},
  props = {},
}: {
  data?: SearchSessionSavedObject[];
  statuses?: Record<string, SearchSessionStatusResponse>;
  props?: Partial<React.ComponentProps<typeof SearchSessionsMgmtTable>>;
}) => {
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockShareStart = sharePluginMock.createStartContract();

  const sessionsClient = new SessionsClient({
    http: mockCoreSetup.http,
  });
  const ebtManager = new SearchSessionEBTManager({
    core: mockCoreSetup,
    logger: coreMock.createPluginInitializerContext().logger.get(),
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
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
    featureFlags: mockCoreStart.featureFlags,
  });
  sessionsClient.find = async () => {
    return {
      saved_objects: data,
      statuses,
    } as unknown as ReturnType<typeof sessionsClient.find>;
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
        locators={mockShareStart.url.locators}
        searchUsageCollector={mockSearchUsageCollector}
        trackingProps={{ renderedIn: 'storybook', openedFrom: 'storybook' }}
        searchSessionEBTManager={ebtManager}
        {...props}
      />
    </IntlProvider>
  );
};

export const Default = {
  name: 'Default',
  render: () => <Component />,
};

export const NoData = {
  name: 'No data',
  render: () => <Component data={[]} />,
};

export const MultiplePages = {
  name: 'Multiple pages',
  render: () => <Component data={getSearchSessionSavedObjectMocks({ length: 500 })} />,
};

export const DifferentApps = {
  name: 'Different apps',
  render: () => {
    const apps = ['discover', 'dashboard', 'visualize', 'canvas', 'ml', 'graph'];

    return (
      <Component
        data={getSearchSessionSavedObjectMocks({
          length: 50,
          overrides: ({ idx }) => {
            return {
              attributes: getPersistedSearchSessionSavedObjectAttributesMock({
                appId: apps[idx % apps.length],
              }),
            };
          },
        })}
      />
    );
  },
};

export const DifferentSearchCounts = {
  name: 'Different search counts',
  render: () => (
    <Component
      data={getSearchSessionSavedObjectMocks({
        length: 50,
        overrides: ({ idx }) => {
          const mappings = Array.from({ length: idx }, (_, i) => [`index-${i}`, `doc-${i}`]);
          const idMapping = Object.fromEntries(mappings);

          return {
            attributes: getPersistedSearchSessionSavedObjectAttributesMock({
              idMapping,
            }),
            numSearches: idx,
          };
        },
      })}
    />
  ),
};

export const DifferentStatuses = {
  name: 'Different statuses',
  render: () => {
    const length = 50;
    const statuses = [
      SearchSessionStatus.CANCELLED,
      SearchSessionStatus.COMPLETE,
      SearchSessionStatus.ERROR,
      SearchSessionStatus.EXPIRED,
      SearchSessionStatus.IN_PROGRESS,
    ];
    const statusMap = Object.fromEntries(
      Array.from({ length }, (_, idx) => [idx, { status: statuses[idx % statuses.length] }])
    );

    return (
      <Component
        statuses={statusMap}
        data={getSearchSessionSavedObjectMocks({
          length,
          overrides: ({ idx }) => {
            return {
              id: idx.toString(),
            };
          },
        })}
      />
    );
  },
};

export const ColumnsFunction = {
  name: 'Columns function',
  render: () => (
    <Component
      props={{
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
          columns.statusColumn('BROWSER'),
        ],
      }}
    />
  ),
};

export const FilteredActions = {
  name: 'Filtered actions',
  render: () => (
    <Component
      props={{
        getColumns: ({
          core,
          api,
          onActionComplete,
          searchUsageCollector,
          kibanaVersion,
        }: GetColumnsParams) => [
          columns.appIdColumn,
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
          columns.statusColumn('BROWSER'),
          columns.actionsColumn({
            core,
            api,
            onActionComplete,
            allowedActions: [ACTION.INSPECT, ACTION.DELETE],
          }),
        ],
      }}
    />
  ),
};

export const NoAppFilter = {
  name: 'No app filter',
  render: () => (
    <Component
      props={{
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
          columns.statusColumn('BROWSER'),
        ],
      }}
    />
  ),
};

export const NoStatusFilter = {
  name: 'No status filter',
  render: () => (
    <Component
      props={{
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.appIdColumn,
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
        ],
      }}
    />
  ),
};

export const NoFilters = {
  name: 'No filters',
  render: () => (
    <Component
      props={{
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
        ],
      }}
    />
  ),
};

export const NoRefreshButton = {
  name: 'No refresh button',
  render: () => <Component props={{ hideRefreshButton: true }} />,
};

export const NoFiltersAndRefreshButton = {
  name: 'No filters and refresh button',
  render: () => (
    <Component
      props={{
        hideRefreshButton: true,
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
        ],
      }}
    />
  ),
};

export const PreFilteredSessions = {
  name: 'PreFiltered sessions',
  argTypes: {
    appId: {
      options: ['discover', 'dashboard'],
      control: { type: 'select' },
    },
  },
  args: {
    appId: 'discover',
  },
  render: (args: { appId: string }) => (
    <Component
      data={getSearchSessionSavedObjectMocks({
        length: 50,
        overrides: ({ idx }) => {
          const mappings = Array.from({ length: idx }, (_, i) => [`index-${i}`, `doc-${i}`]);
          const idMapping = Object.fromEntries(mappings);

          return {
            attributes: getPersistedSearchSessionSavedObjectAttributesMock({
              idMapping,
              appId: idx % 2 === 0 ? 'discover' : 'dashboard',
            }),
            numSearches: idx,
          };
        },
      })}
      props={{
        appId: args.appId,
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.nameColumn({ core, searchUsageCollector, kibanaVersion }),
          columns.appIdColumn,
        ],
      }}
    />
  ),
};

export const OnClickHandler = {
  name: 'On click handler',
  render: () => (
    <Component
      data={getSearchSessionSavedObjectMocks({ length: 10 })}
      props={{
        getColumns: ({ core, searchUsageCollector, kibanaVersion }: GetColumnsParams) => [
          columns.nameColumn({
            core,
            searchUsageCollector,
            kibanaVersion,
            onBackgroundSearchOpened: ({ session }) =>
              alert(`You have clicked session ${session.name}`),
          }),
        ],
      }}
    />
  ),
};
