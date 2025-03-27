/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TabItem, UnifiedTabs, TabStatus } from '@kbn/unified-tabs';
import React, { useRef, useState } from 'react';
import { pick } from 'lodash';
import type { DiscoverSessionViewRef } from '../session_view';
import { DiscoverSessionView, type DiscoverSessionViewProps } from '../session_view';
import {
  createTabItem,
  internalStateActions,
  selectAllTabs,
  selectCurrentTab,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const TabsView = ({ sessionViewProps }: { sessionViewProps: DiscoverSessionViewProps }) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const currentTab = useInternalStateSelector(selectCurrentTab);
  const allTabs = useInternalStateSelector(selectAllTabs);
  const [initialItems] = useState<TabItem[]>(() => allTabs.map((tab) => pick(tab, 'id', 'label')));
  const sessionViewRef = useRef<DiscoverSessionViewRef>(null);

  return (
    <UnifiedTabs
      services={services}
      initialItems={initialItems}
      onChanged={(updateState) =>
        dispatch(
          internalStateActions.updateTabs({
            updateState,
            stopSyncing: sessionViewRef.current?.stopSyncing,
          })
        )
      }
      createItem={() => createTabItem(allTabs)}
      getPreviewData={() => ({
        query: { language: 'kuery', query: 'sample query' },
        status: TabStatus.SUCCESS,
      })}
      renderContent={() => (
        <DiscoverSessionView key={currentTab.id} ref={sessionViewRef} {...sessionViewProps} />
      )}
    />
  );
};
