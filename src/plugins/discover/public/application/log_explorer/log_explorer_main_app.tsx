/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import type { DataViewAttributes } from '@kbn/data-views-plugin/public';
import type { SavedObject } from '@kbn/data-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { LogExplorerLayout } from './components/layout/log_explorer_layout';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DataTableRecord } from '../../types';
import { StateMachineProvider as QueryDataProvider } from './hooks/query_data/use_state_machine';
import { LOG_EXPLORER_VIRTUAL_GRID_ROWS } from './constants';
import { DiscoverStateProvider } from './hooks/discover_state/use_discover_state';
import { DiscoverColumnsProvider } from './hooks/discover_state/use_columns';

const LogExplorerLayoutMemoized = React.memo(LogExplorerLayout);

export interface LogExplorerMainAppProps {
  /**
   * List of available index patterns
   */
  dataViewList: Array<SavedObject<DataViewAttributes>>;
  /**
   * Current instance of SavedSearch
   */
  savedSearch: SavedSearch;
}

export function LogExplorerMainApp(props: LogExplorerMainAppProps) {
  const { savedSearch, dataViewList } = props;
  const { data } = useDiscoverServices();
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  return (
    <DiscoverStateProvider savedSearch={savedSearch} setExpandedDoc={setExpandedDoc}>
      <QueryDataProvider virtualRowCount={LOG_EXPLORER_VIRTUAL_GRID_ROWS} query={data.query}>
        <DiscoverColumnsProvider>
          <LogExplorerLayoutMemoized
            dataViewList={dataViewList}
            expandedDoc={expandedDoc}
            setExpandedDoc={setExpandedDoc}
            savedSearch={savedSearch}
          />
        </DiscoverColumnsProvider>
      </QueryDataProvider>
    </DiscoverStateProvider>
  );
}
