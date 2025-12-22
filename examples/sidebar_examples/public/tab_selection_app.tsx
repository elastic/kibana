/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiSpacer, EuiButtonGroup, EuiText, EuiFormRow } from '@elastic/eui';
import { z } from '@kbn/zod/v4';
import { createSidebarAppHooks } from '@kbn/core-chrome-sidebar';

export const tabSelectionAppId = 'sidebarExampleTabs';

export const getTabSelectionStateSchema = () =>
  z.object({
    selectedTab: z.string().default('overview'),
  });

export type TabSelectionSidebarState = z.infer<ReturnType<typeof getTabSelectionStateSchema>>;

export const tabApp = createSidebarAppHooks<TabSelectionSidebarState>(tabSelectionAppId)(
  ({ set, open }) => ({
    selectTab: (tab: string) => set({ selectedTab: tab }),
    openTab: (tab: string) => {
      set({ selectedTab: tab });
      open();
    },
    reset: () => set({ selectedTab: 'overview' }),
  })
);

const selectSelectedTab = (s: TabSelectionSidebarState) => s.selectedTab;

export function TabSelectionApp() {
  const selectedTab = tabApp.useSelector(selectSelectedTab);
  const { openTab } = tabApp.useActions();

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'settings', label: 'Settings' },
    { id: 'about', label: 'About' },
  ];

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiTitle size="s">
        <h2>Tab Selection Example</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiText size="s" color="subdued">
        <p>Simple tab selection with state persistence.</p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFormRow label="Tab Selection">
        <EuiButtonGroup
          legend="Select a tab"
          options={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
          }))}
          idSelected={selectedTab}
          onChange={(id) => openTab(id)}
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify({ selectedTab }, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
