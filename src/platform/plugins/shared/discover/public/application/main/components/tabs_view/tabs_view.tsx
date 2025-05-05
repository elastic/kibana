/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedTabs, type UnifiedTabsProps } from '@kbn/unified-tabs';
import React, { useCallback } from 'react';
import { DiscoverSessionView, type DiscoverSessionViewProps } from '../session_view';
import {
  createTabItem,
  internalStateActions,
  selectAllTabs,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { usePreviewData } from './use_preview_data';

export const TabsView = (props: DiscoverSessionViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const { currentTabId, recentlyClosedItems, groupId } = useInternalStateSelector((state) => ({
    currentTabId: state.tabs.unsafeCurrentId,
    recentlyClosedItems: state.tabs.recentlyClosedTabs,
    groupId: state.tabs.groupId,
  }));
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);

  const onChanged: UnifiedTabsProps['onChanged'] = useCallback(
    (updateState) => dispatch(internalStateActions.updateTabs(updateState)),
    [dispatch]
  );

  const createItem: UnifiedTabsProps['createItem'] = useCallback(
    () => createTabItem(allTabs),
    [allTabs]
  );

  const renderContent: UnifiedTabsProps['renderContent'] = useCallback(
    () => <DiscoverSessionView key={currentTabId} {...props} />,
    [currentTabId, props]
  );

  return (
    <UnifiedTabs
      key={groupId}
      services={services}
      initialItems={allTabs}
      initialSelectedItemId={currentTabId}
      recentlyClosedItems={recentlyClosedItems}
      createItem={createItem}
      getPreviewData={getPreviewData}
      renderContent={renderContent}
      onChanged={onChanged}
    />
  );
};
