/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import { EuiButton, EuiInMemoryTable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import { TableText } from '..';
import { SEARCH_SESSIONS_TABLE_ID } from '../../../../../../common';
import type { SearchSessionsMgmtAPI } from '../../lib/api';
import { getColumns as getDefaultColumns } from './columns/get_columns';
import type { BackgroundSearchOpenedHandler, LocatorsStart, UISession } from '../../types';
import type { OnActionComplete } from './actions';
import { getAppFilter } from './utils/get_app_filter';
import { getStatusFilter } from './utils/get_status_filter';
import type { SearchUsageCollector } from '../../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../../server/config';
import { mapToUISession } from './utils/map_to_ui_session';
import type { ISearchSessionEBTManager } from '../../../ebt_manager';

interface Props {
  core: CoreStart;
  locators: LocatorsStart;
  api: SearchSessionsMgmtAPI;
  searchSessionEBTManager: ISearchSessionEBTManager;
  timezone: string;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  searchUsageCollector: SearchUsageCollector;
  hideRefreshButton?: boolean;
  appId?: string;
  onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
  getColumns?: (params: {
    core: CoreStart;
    api: SearchSessionsMgmtAPI;
    config: SearchSessionsConfigSchema;
    timezone: string;
    kibanaVersion: string;
    searchUsageCollector: SearchUsageCollector;
    onActionComplete: OnActionComplete;
    onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
  }) => Array<EuiBasicTableColumn<UISession>>;
  trackingProps: { openedFrom: string; renderedIn: string };
}

export type GetColumnsFn = Props['getColumns'];

export function SearchSessionsMgmtTable({
  core,
  locators,
  api,
  timezone,
  config,
  searchSessionEBTManager,
  kibanaVersion,
  searchUsageCollector,
  hideRefreshButton = false,
  getColumns = getDefaultColumns,
  appId,
  onBackgroundSearchOpened,
  trackingProps,
  ...props
}: Props) {
  const [tableData, setTableData] = useState<UISession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedIsLoading, setDebouncedIsLoading] = useState(false);
  const showLatestResultsHandler = useRef<Function>();
  const refreshTimeoutRef = useRef<number | null>(null);
  const refreshInterval = useMemo(
    () => moment.duration(config.management.refreshInterval).asMilliseconds(),
    [config.management.refreshInterval]
  );

  const { pageSize, sorting, onTableChange } = useEuiTablePersist<UISession>({
    tableId: 'searchSessionsMgmt',
    initialSort: {
      field: 'created',
      direction: 'desc',
    },
  });

  // Debounce rendering the state of the Refresh button
  useDebounce(
    () => {
      setDebouncedIsLoading(isLoading);
    },
    250,
    [isLoading]
  );

  useEffect(() => {
    searchSessionEBTManager.trackBgsListView({ entryPoint: trackingProps.openedFrom });
  }, [searchSessionEBTManager, trackingProps.openedFrom]);

  // refresh behavior
  const doRefresh = useCallback(async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    setIsLoading(true);
    const renderResults = (results: UISession[]) => {
      setTableData(results);
    };
    showLatestResultsHandler.current = renderResults;

    if (document.visibilityState !== 'hidden') {
      let results: UISession[] = [];
      try {
        const { savedObjects, statuses } = await api.fetchTableData({ appId });
        results = savedObjects.map((savedObject) =>
          mapToUISession({
            savedObject,
            locators,
            sessionStatuses: statuses,
          })
        );
      } catch (e) {} // eslint-disable-line no-empty

      if (showLatestResultsHandler.current === renderResults) {
        renderResults(results);
        setIsLoading(false);
      }
    }

    if (showLatestResultsHandler.current === renderResults && refreshInterval > 0) {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = window.setTimeout(doRefresh, refreshInterval);
    }
  }, [api, refreshInterval, locators, appId]);

  // initial data load
  useEffect(() => {
    doRefresh();
    searchUsageCollector.trackSessionsListLoaded();
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [doRefresh, searchUsageCollector]);

  const onActionComplete: OnActionComplete = () => {
    doRefresh();
  };

  const columns = getColumns({
    core,
    api,
    config,
    timezone,
    onActionComplete,
    kibanaVersion,
    searchUsageCollector,
    onBackgroundSearchOpened: (attrs) => {
      searchSessionEBTManager.trackBgsOpened({
        session: attrs.session,
        resumeSource: trackingProps.renderedIn,
      });
      onBackgroundSearchOpened?.(attrs);
    },
  });

  const filters = useMemo(() => {
    const _filters = [];

    const hasAppColumn = columns.some((column) => 'field' in column && column.field === 'appId');
    if (hasAppColumn && !appId) _filters.push(getAppFilter(tableData));

    const hasStatusColumn = columns.some(
      (column) => 'field' in column && column.field === 'status'
    );
    if (hasStatusColumn) _filters.push(getStatusFilter(tableData));

    return _filters;
  }, [columns, tableData, appId]);

  // table config: search / filters
  const search: EuiSearchBarProps = {
    box: { incremental: true },
    filters,
    toolsRight: hideRefreshButton ? undefined : (
      <TableText>
        <EuiButton
          fill
          iconType="refresh"
          onClick={doRefresh}
          disabled={debouncedIsLoading}
          isLoading={debouncedIsLoading}
          data-test-subj="sessionManagementRefreshBtn"
        >
          <FormattedMessage
            id="data.mgmt.searchSessions.search.tools.refresh"
            defaultMessage="Refresh"
          />
        </EuiButton>
      </TableText>
    ),
  };

  return (
    <EuiInMemoryTable<UISession>
      {...props}
      id={SEARCH_SESSIONS_TABLE_ID}
      data-test-subj={SEARCH_SESSIONS_TABLE_ID}
      rowProps={(searchSession: UISession) => ({
        'data-test-subj': `searchSessionsRow`,
        'data-test-search-session-id': `id-${searchSession.id}`,
      })}
      columns={columns}
      items={tableData}
      pagination={{
        pageSize,
      }}
      search={search}
      sorting={sorting}
      onTableChange={onTableChange}
      tableLayout="auto"
    />
  );
}
