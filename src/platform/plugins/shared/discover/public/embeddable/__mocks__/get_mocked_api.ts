/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { SearchSource } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { TimeRange } from '@kbn/es-query';
import { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { FetchContext } from '@kbn/presentation-publishing';
import { DiscoverGridSettings, SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import type { SortOrder, DataGridDensity } from '@kbn/unified-data-table';

export const getMockedSearchApi = ({
  searchSource,
  savedSearch,
}: {
  searchSource: SearchSource;
  savedSearch: SavedSearch;
}) => {
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  return {
    api: {
      uuid: 'testEmbeddable',
      savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
      dataViews$: new BehaviorSubject<DataView[] | undefined>([
        searchSource.getField('index') ?? dataViewMock,
      ]),
      title$: new BehaviorSubject<string | undefined>(undefined),
      defaultTitle$: new BehaviorSubject<string | undefined>(undefined),
      hideTitle$: new BehaviorSubject<boolean | undefined>(false),
      fetchContext$: new BehaviorSubject<FetchContext | undefined>(undefined),
      timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      setTimeRange: jest.fn(),
      dataLoading$,
      blockingError$,
      fetchWarnings$: new BehaviorSubject<SearchResponseIncompleteWarning[]>([]),
      savedSearch$: new BehaviorSubject<SavedSearch>(savedSearch),
    },
    stateManager: {
      sort: new BehaviorSubject<SortOrder[] | undefined>(savedSearch.sort),
      columns: new BehaviorSubject<string[] | undefined>(savedSearch.columns),
      viewMode: new BehaviorSubject<VIEW_MODE | undefined>(savedSearch.viewMode),
      rowHeight: new BehaviorSubject<number | undefined>(savedSearch.rowHeight),
      headerRowHeight: new BehaviorSubject<number | undefined>(savedSearch.headerRowHeight),
      rowsPerPage: new BehaviorSubject<number | undefined>(savedSearch.rowsPerPage),
      sampleSize: new BehaviorSubject<number | undefined>(savedSearch.sampleSize),
      density: new BehaviorSubject<DataGridDensity | undefined>(savedSearch.density),
      grid: new BehaviorSubject<DiscoverGridSettings | undefined>(savedSearch.grid),
      rows: new BehaviorSubject<DataTableRecord[]>([]),
      totalHitCount: new BehaviorSubject<number | undefined>(0),
      columnsMeta: new BehaviorSubject<Record<string, DatatableColumnMeta> | undefined>(undefined),
      inspectorAdapters: new BehaviorSubject<Adapters>({}),
    },
    setters: {
      setDataLoading: (dataLoading: boolean | undefined) => dataLoading$.next(dataLoading),
      setBlockingError: (error: Error | undefined) => blockingError$.next(error),
    },
  };
};
