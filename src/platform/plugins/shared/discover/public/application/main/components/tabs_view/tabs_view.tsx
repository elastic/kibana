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
import React, { useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { DiscoverSessionViewRef } from '../session_view';
import { DiscoverSessionView, type DiscoverSessionViewProps } from '../session_view';

const DEFAULT_TAB_LABEL = 'Untitled session';
const DEFAULT_TAB_REGEX = new RegExp(`^${DEFAULT_TAB_LABEL}( \\d+)?$`);

interface DiscoverSessionTab extends TabItem {
  globalState?: Record<string, unknown>;
  appState?: Record<string, unknown>;
}

export const TabsView = ({ sessionViewProps }: { sessionViewProps: DiscoverSessionViewProps }) => {
  const [currentTabId, setCurrentTabId] = useState<string>(uuid());
  const [tabs, setTabs] = useState<DiscoverSessionTab[]>([
    { id: currentTabId, label: DEFAULT_TAB_LABEL },
  ]);
  const sessionViewRef = useRef<DiscoverSessionViewRef>(null);

  return (
    <UnifiedTabs
      initialItems={tabs}
      onChanged={async ({ items, selectedItem }) => {
        let updatedTabs: DiscoverSessionTab[] = items.map(
          (item) => tabs.find((tab) => tab.id === item.id) ?? item
        );

        if (selectedItem && selectedItem?.id !== currentTabId) {
          sessionViewRef.current?.stopSyncing();

          const currentTab = tabs.find((tab) => tab.id === currentTabId);

          if (currentTab) {
            const updatedTab: DiscoverSessionTab = {
              ...currentTab,
              globalState: sessionViewProps.urlStateStorage.get('_g') ?? undefined,
              appState: sessionViewProps.urlStateStorage.get('_a') ?? undefined,
            };

            updatedTabs = updatedTabs.map((tab) => (tab.id === currentTabId ? updatedTab : tab));
          }

          const selectedTab = tabs.find((tab) => tab.id === selectedItem.id);

          if (selectedTab) {
            await sessionViewProps.urlStateStorage.set('_g', selectedTab.globalState);
            await sessionViewProps.urlStateStorage.set('_a', selectedTab.appState);
          } else {
            await sessionViewProps.urlStateStorage.set('_g', {});
            await sessionViewProps.urlStateStorage.set('_a', {});
          }

          setCurrentTabId(selectedItem.id);
        }

        setTabs(updatedTabs);
      }}
      createItem={() => {
        const id = uuid();
        const untitledTabCount = tabs.filter((tab) =>
          DEFAULT_TAB_REGEX.test(tab.label.trim())
        ).length;
        const label =
          untitledTabCount > 0 ? `${DEFAULT_TAB_LABEL} ${untitledTabCount}` : DEFAULT_TAB_LABEL;

        return { id, label };
      }}
      renderContent={() => (
        <DiscoverSessionView key={currentTabId} ref={sessionViewRef} {...sessionViewProps} />
      )}
    />
  );
};
