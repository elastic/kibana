/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { DiscoverSessionApiTab } from '@kbn/as-code-discover-schema';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredDataView } from '@kbn/as-code-data-views-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import { isDiscoverSessionEsqlTab } from '../../common/session/type_guards';
import { useDiscoverServices } from '../hooks/use_discover_services';

const noop = () => {};

/** Resolves the data view of a classic tab: by id when referenced, or created in memory when inline. */
const useTabDataView = (tab: DiscoverSessionApiTab): DataView | undefined => {
  const { dataViews } = useDiscoverServices();
  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    if (isDiscoverSessionEsqlTab(tab)) {
      setDataView(undefined);
      return;
    }

    let isCancelled = false;
    const stored = toStoredDataView(tab.data_source);
    const resolve =
      typeof stored === 'string' ? dataViews.get(stored) : dataViews.create(stored, true);
    resolve
      .then((resolved) => !isCancelled && setDataView(resolved))
      .catch(() => !isCancelled && setDataView(undefined)); // the preview is still useful without it

    return () => {
      isCancelled = true;
    };
  }, [dataViews, tab]);

  return dataView;
};

/**
 * Shows the data view, query, filters and time range of a session tab in a disabled search bar.
 */
export const DiscoverSessionHistorySearchBar = ({
  tab,
  timeRange,
}: {
  tab: DiscoverSessionApiTab;
  timeRange: TimeRange;
}): JSX.Element => {
  const { unifiedSearch } = useDiscoverServices();
  const dataView = useTabDataView(tab);
  const isEsql = isDiscoverSessionEsqlTab(tab);

  const query = useMemo<Query | AggregateQuery | undefined>(
    () => (isEsql ? { esql: tab.data_source.query } : toStoredQuery(tab.query)),
    [isEsql, tab]
  );
  const filters = useMemo(() => (isEsql ? [] : toStoredFilters(tab.filters) ?? []), [isEsql, tab]);

  // a disabled picker only shows which data view the version used
  const dataViewPickerProps = useMemo<DataViewPickerProps | undefined>(
    () =>
      dataView
        ? {
            trigger: {
              label: dataView.getName(),
              title: dataView.getIndexPattern(),
              'data-test-subj': 'discoverChangeHistoryDataViewPicker',
            },
            currentDataViewId: dataView.id,
            onChangeDataView: noop,
            isDisabled: true,
          }
        : undefined,
    [dataView]
  );

  return (
    <unifiedSearch.ui.AggregateQuerySearchBar<Query | AggregateQuery>
      appName="discover"
      indexPatterns={dataView ? [dataView] : []}
      query={query}
      filters={filters}
      dateRangeFrom={timeRange.from}
      dateRangeTo={timeRange.to}
      isDisabled
      disableSubscribingToGlobalDataServices
      showQueryInput
      showFilterBar={filters.length > 0}
      showDatePicker={Boolean(isEsql || dataView?.isTimeBased())}
      dataViewPickerComponentProps={dataViewPickerProps}
      displayStyle="detached"
      data-test-subj="discoverChangeHistorySearchBar"
    />
  );
};
