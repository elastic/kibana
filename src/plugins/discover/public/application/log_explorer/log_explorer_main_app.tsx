/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback, useEffect } from 'react';
import type { DataViewAttributes } from '@kbn/data-views-plugin/public';
import type { SavedObject } from '@kbn/data-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { useActor } from '@xstate/react';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../common';
import { LogExplorerLayout } from './components/layout/log_explorer_layout';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DataTableRecord } from '../../types';
import { StateMachineProvider as QueryDataProvider } from './hooks/query_data/use_state_machine';
import { LOG_EXPLORER_VIRTUAL_GRID_ROWS } from './constants';
import { DiscoverStateProvider } from './hooks/discover_state/use_discover_state';
import { DiscoverColumnsProvider } from './hooks/discover_state/use_columns';
import { useStateMachineContext } from './hooks/query_data/use_state_machine';
import { DiscoverUninitialized } from '../main/components/uninitialized/uninitialized';
import { LogExplorerLayoutProps } from './components/layout/log_explorer_layout';

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

export function LogExplorerMainApp({ savedSearch, dataViewList }: LogExplorerMainAppProps) {
  const { data } = useDiscoverServices();

  // TODO: use expandedDoc state
  const [, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  return (
    <DiscoverStateProvider savedSearch={savedSearch} setExpandedDoc={setExpandedDoc}>
      <QueryDataProvider virtualRowCount={LOG_EXPLORER_VIRTUAL_GRID_ROWS} query={data.query}>
        <DiscoverColumnsProvider>
          <LogExplorerLayoutWrapper dataViewList={dataViewList} savedSearch={savedSearch} />
        </DiscoverColumnsProvider>
      </QueryDataProvider>
    </DiscoverStateProvider>
  );
}

const LogExplorerLayoutWrapper = ({ dataViewList, savedSearch }: LogExplorerLayoutProps) => {
  const stateMachine = useStateMachineContext();
  const [dataAccessState] = useActor(stateMachine);
  const { uiSettings: config } = useDiscoverServices();

  const initialize = useCallback(() => {
    stateMachine.send('initialize');
  }, [stateMachine]);

  useEffect(() => {
    // NOTE: Discover uses some additional criteria we might want to consider:
    // https://github.com/elastic/kibana/blob/main/src/plugins/discover/public/application/main/hooks/use_discover_state.ts#L96
    const shouldSearchOnPageLoad =
      config.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) || savedSearch.id !== undefined; // NOTE: SOPL setting has no effect when there's a saved search
    if (shouldSearchOnPageLoad) {
      initialize();
    }
  }, [config, initialize, savedSearch.id]);

  return dataAccessState.matches('uninitialized') ? (
    <DiscoverUninitialized onRefresh={initialize} />
  ) : (
    <LogExplorerLayoutMemoized dataViewList={dataViewList} savedSearch={savedSearch} />
  );
};
