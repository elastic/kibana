/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '@kbn/unified-tabs';
import { UnifiedTabs } from '@kbn/unified-tabs';
import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { DiscoverSessionView, type DiscoverSessionViewProps } from '../session_view';

const DEFAULT_TAB_LABEL = 'Untitled session';
const DEFAULT_TAB_REGEX = new RegExp(`^${DEFAULT_TAB_LABEL}( \\d+)?$`);

export const TabsView = ({ sessionViewProps }: { sessionViewProps: DiscoverSessionViewProps }) => {
  const [currentTabId, setCurrentTabId] = useState<string>(uuid());
  const [tabs, setTabs] = useState<TabItem[]>([{ id: currentTabId, label: DEFAULT_TAB_LABEL }]);

  return (
    <UnifiedTabs
      initialItems={tabs}
      onChanged={({ items, selectedItem }) => {
        setTabs(items);
        if (selectedItem) {
          setCurrentTabId(selectedItem.id);
        }
      }}
      createItem={() => {
        const id = uuid();
        const untitledTabCount = tabs.filter((tab) =>
          DEFAULT_TAB_REGEX.test(tab.label.trim())
        ).length;
        return { id, label: `${DEFAULT_TAB_LABEL} ${untitledTabCount + 1}` };
      }}
      renderContent={({ id }) => <DiscoverSessionView key={id} {...sessionViewProps} />}
    />
  );
};
