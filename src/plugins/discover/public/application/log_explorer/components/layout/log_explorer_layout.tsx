/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPageContent_Deprecated } from '@elastic/eui';
import type { SavedObject } from '@kbn/data-plugin/public';
import type { DataViewAttributes } from '@kbn/data-views-plugin/public';
import { isOfQueryType } from '@kbn/es-query';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import classNames from 'classnames';
import React, { useEffect, useRef } from 'react';
import { useDiscoverStateContext } from '../../../main/hooks/use_discover_state';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import '../../../main/components/layout/discover_layout.scss';
import { LoadingSpinner } from '../../../main/components/loading_spinner/loading_spinner';
import { DiscoverNoResults } from '../../../main/components/no_results';
import { useEntries } from '../../hooks/query_data/use_state_machine';
import { LogExplorer } from './log_explorer';
import { hasActiveFilter } from '../../../main/components/layout/utils';

export interface LogExplorerLayoutProps {
  dataViewList: Array<SavedObject<DataViewAttributes>>;
  savedSearch: SavedSearch;
}

export function LogExplorerLayout({ savedSearch }: LogExplorerLayoutProps) {
  // Access to Discover services
  const { data } = useDiscoverServices();

  // Access to "outer" Discover state
  const { stateContainer } = useDiscoverStateContext();
  const state = stateContainer.appStateContainer.getState();

  // Data querying state machine access and derivatives
  const { actor: entriesActor, state: entriesState } = useEntries();

  const contentCentered =
    entriesState.matches('uninitialized') || entriesState.matches('failedNoData');

  const savedSearchTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    savedSearchTitle.current?.focus();
  }, []);

  return (
    <EuiFlexItem className="dscPageContent__wrapper" style={{ paddingRight: 0 }}>
      <EuiPageContent_Deprecated
        verticalPosition={contentCentered ? 'center' : undefined}
        horizontalPosition={contentCentered ? 'center' : undefined}
        paddingSize="none"
        hasShadow={false}
        className={classNames('dscPageContent', {
          'dscPageContent--centered': contentCentered,
          'dscPageContent--emptyPrompt': entriesState.matches('failedNoData'),
        })}
      >
        {entriesState.matches('failedNoData') ? (
          <DiscoverNoResults
            isTimeBased={true}
            data={data}
            // error={dataState.error}
            hasQuery={isOfQueryType(state.query) && !!state.query?.query}
            hasFilters={hasActiveFilter(state.filters)}
            onDisableFilters={() => {}}
          />
        ) : entriesState.matches('loadingAround') ? (
          <LoadingSpinner />
        ) : (
          <EuiFlexGroup
            className="dscPageContent__inner"
            direction="column"
            alignItems="stretch"
            gutterSize="none"
            responsive={false}
          >
            <LogExplorer savedSearch={savedSearch} stateMachine={entriesActor} />
          </EuiFlexGroup>
        )}
      </EuiPageContent_Deprecated>
    </EuiFlexItem>
  );
}
