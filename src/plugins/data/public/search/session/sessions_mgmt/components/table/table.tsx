/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiInMemoryTable, EuiSearchBarProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useInterval from 'react-use/lib/useInterval';
import { TableText } from '..';
import { SEARCH_SESSIONS_TABLE_ID } from '../../../../../../common';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { getColumns } from '../../lib/get_columns';
import { UISession } from '../../types';
import { OnActionComplete } from '../actions';
import { getAppFilter } from './app_filter';
import { getStatusFilter } from './status_filter';
import { SearchUsageCollector } from '../../../../collectors';
import { SearchSessionsConfigSchema } from '../../../../../../config';

interface Props {
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  timezone: string;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  searchUsageCollector: SearchUsageCollector;
}

export function SearchSessionsMgmtTable({
  core,
  api,
  timezone,
  config,
  kibanaVersion,
  searchUsageCollector,
  ...props
}: Props) {
  const [tableData, setTableData] = useState<UISession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedIsLoading, setDebouncedIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const showLatestResultsHandler = useRef<Function>();
  const refreshInterval = useMemo(
    () => moment.duration(config.management.refreshInterval).asMilliseconds(),
    [config.management.refreshInterval]
  );

  // Debounce rendering the state of the Refresh button
  useDebounce(
    () => {
      setDebouncedIsLoading(isLoading);
    },
    250,
    [isLoading]
  );

  // refresh behavior
  const doRefresh = useCallback(async () => {
    setIsLoading(true);
    const renderResults = (results: UISession[]) => {
      setTableData(results);
    };
    showLatestResultsHandler.current = renderResults;
    let results: UISession[] = [];
    try {
      results = await api.fetchTableData();
    } catch (e) {} // eslint-disable-line no-empty

    if (showLatestResultsHandler.current === renderResults) {
      renderResults(results);
      setIsLoading(false);
    }
  }, [api]);

  // initial data load
  useEffect(() => {
    doRefresh();
    searchUsageCollector.trackSessionsListLoaded();
  }, [doRefresh, searchUsageCollector]);

  useInterval(doRefresh, refreshInterval);

  const onActionComplete: OnActionComplete = () => {
    doRefresh();
  };

  // table config: search / filters
  const search: EuiSearchBarProps = {
    box: { incremental: true },
    filters: [getStatusFilter(tableData), getAppFilter(tableData)],
    toolsRight: (
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
      columns={getColumns(
        core,
        api,
        config,
        timezone,
        onActionComplete,
        kibanaVersion,
        searchUsageCollector
      )}
      items={tableData}
      pagination={pagination}
      search={search}
      sorting={{ sort: { field: 'created', direction: 'desc' } }}
      onTableChange={({ page: { index } }) => {
        setPagination({ pageIndex: index });
      }}
      tableLayout="auto"
    />
  );
}
