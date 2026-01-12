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
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';

export const tabSelectionAppId = 'sidebarExampleTabs';

export const getTabSelectionParamsSchema = () =>
  z.object({
    selectedTab: z.string().default('overview'),
  });

export type TabSelectionSidebarParams = z.infer<ReturnType<typeof getTabSelectionParamsSchema>>;

/**
 * Tab selection app that receives params and setParams as props.
 * Params are persisted to localStorage automatically.
 */
export function TabSelectionApp({
  params,
  setParams,
}: SidebarComponentProps<TabSelectionSidebarParams>) {
  const { selectedTab } = params;

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
        <p>Simple tab selection with params persistence.</p>
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
          onChange={(id) => setParams({ selectedTab: id })}
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify(params, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
