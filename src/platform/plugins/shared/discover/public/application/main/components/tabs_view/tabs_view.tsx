/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TabItem, UnifiedTabs } from '@kbn/unified-tabs';
import React, { useState } from 'react';
import { pick } from 'lodash';
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
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const [initialItems] = useState<TabItem[]>(() => allTabs.map((tab) => pick(tab, 'id', 'label')));
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);

  return (
    <UnifiedTabs
      services={services}
      initialItems={initialItems}
      onChanged={(updateState) => dispatch(internalStateActions.updateTabs(updateState))}
      createItem={() => createTabItem(allTabs)}
      getPreviewData={getPreviewData}
      renderContent={() => <DiscoverSessionView key={currentTabId} {...props} />}
    />
  );
};
