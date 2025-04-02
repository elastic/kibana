/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TabItem, UnifiedTabs, TabStatus } from '@kbn/unified-tabs';
import React, { useState } from 'react';
import { pick } from 'lodash';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { DiscoverSessionView, type DiscoverSessionViewProps } from '../session_view';
import {
  CurrentTabProvider,
  createTabItem,
  internalStateActions,
  selectAllTabs,
  selectTabRuntimeState,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';

export const TabsView = ({
  initialTabId,
  sessionViewProps,
}: {
  initialTabId: string;
  sessionViewProps: DiscoverSessionViewProps;
}) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const [currentTabId, setCurrentTabId] = useState<string | undefined>(initialTabId);
  const [initialItems] = useState<TabItem[]>(() => allTabs.map((tab) => pick(tab, 'id', 'label')));

  return (
    <UnifiedTabs
      services={services}
      initialItems={initialItems}
      onChanged={async (updateState) => {
        setCurrentTabId(undefined);
        await dispatch(
          internalStateActions.updateTabs({
            currentTabId: currentTabId ?? initialTabId,
            updateState,
          })
        );
        setCurrentTabId(updateState.selectedItem?.id ?? currentTabId);
      }}
      createItem={() => createTabItem(allTabs)}
      getPreviewData={(item) => {
        const defaultQuery = { language: 'kuery', query: '(Empty query)' };
        const stateContainer = selectTabRuntimeState(
          sessionViewProps.runtimeStateManager,
          item.id
        ).stateContainer$.getValue();

        if (!stateContainer) {
          return {
            query: defaultQuery,
            status: TabStatus.RUNNING,
          };
        }

        const fetchStatus = stateContainer.dataState.data$.main$.getValue().fetchStatus;
        const query = stateContainer.appState.getState().query;

        return {
          query: isOfAggregateQueryType(query)
            ? { esql: query.esql.trim() || defaultQuery.query }
            : query
            ? { ...query, query: query.query.trim() || defaultQuery.query }
            : defaultQuery,
          status: [FetchStatus.UNINITIALIZED, FetchStatus.COMPLETE].includes(fetchStatus)
            ? TabStatus.SUCCESS
            : fetchStatus === FetchStatus.ERROR
            ? TabStatus.ERROR
            : TabStatus.RUNNING,
        };
      }}
      renderContent={() =>
        currentTabId && (
          <CurrentTabProvider currentTabId={currentTabId}>
            <DiscoverSessionView key={currentTabId} {...sessionViewProps} />
          </CurrentTabProvider>
        )
      }
    />
  );
};
