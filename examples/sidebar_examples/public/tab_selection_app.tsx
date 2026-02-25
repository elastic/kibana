/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiButtonGroup, EuiText, EuiFormRow, EuiTitle } from '@elastic/eui';
import { z } from '@kbn/zod/v4';
import { createSidebarStore, type SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarHeader, SidebarBody, useSidebarApp } from '@kbn/core-chrome-sidebar-components';

export const tabSelectionAppId = 'sidebarExampleTabs';

/** Store for tab selection sidebar app */
export const tabSelectionStore = createSidebarStore({
  schema: z.object({
    selectedTab: z.string().default('overview'),
  }),
  actions: (set, get, sidebar) => ({
    selectTab: (tabId: string) => set({ selectedTab: tabId }),
  }),
});

export type TabSelectionState = typeof tabSelectionStore.types.state;
export type TabSelectionActions = typeof tabSelectionStore.types.actions;

/** Typed hook for the tab selection sidebar app */
export const useTabSelectionSidebarApp = () =>
  useSidebarApp<TabSelectionState, TabSelectionActions>(tabSelectionAppId);

/**
 * Tab selection app that demonstrates custom header content.
 * Uses children prop of SidebarHeader for a dynamic title based on the selected tab.
 */
export function TabSelectionApp({
  state,
  actions,
  onClose,
}: SidebarComponentProps<TabSelectionState, TabSelectionActions>) {
  const { selectedTab } = state;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'settings', label: 'Settings' },
    { id: 'about', label: 'About' },
  ];

  const currentTab = tabs.find((t) => t.id === selectedTab) ?? tabs[0];

  return (
    <>
      <SidebarHeader title={`Tabs: ${currentTab.label}`} onClose={onClose}>
        <EuiTitle size="xs">
          <h2>Tabs: {currentTab.label}</h2>
        </EuiTitle>
      </SidebarHeader>
      <SidebarBody>
        <EuiText size="s" color="subdued">
          <p>Demonstrates dynamic header title based on the selected tab.</p>
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
            onChange={(id) => actions.selectTab(id)}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiPanel color="subdued" paddingSize="s">
          <EuiText size="xs">
            <pre>{JSON.stringify(state, null, 2)}</pre>
          </EuiText>
        </EuiPanel>
      </SidebarBody>
    </>
  );
}
