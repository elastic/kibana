/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { DashboardPanelMap } from '@kbn/dashboard-plugin/common';
import { LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';

import panelsJson from './static_by_value_example_panels.json';

const DashboardContainerRenderer = withSuspense(LazyDashboardContainerRenderer);

export const StaticByValueExample = () => {
  return (
    <>
      <EuiTitle>
        <h2>Static, by value example</h2>
      </EuiTitle>
      <EuiText>
        <p>Creates and displays static, non-editable by value dashboard.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <DashboardContainerRenderer
          getCreationOptions={async () => {
            return {
              initialInput: {
                timeRange: { from: 'now-30d', to: 'now' },
                viewMode: ViewMode.VIEW,
                panels: panelsJson as DashboardPanelMap,
              },
            };
          }}
          onDashboardContainerLoaded={(container) => {
            return; // this example is static, so don't need to do anything with the dashboard container
          }}
        />
      </EuiPanel>
    </>
  );
};
