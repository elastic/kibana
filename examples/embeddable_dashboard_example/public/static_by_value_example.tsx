/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EmbeddableStart, ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { DashboardPanelMap } from '@kbn/dashboard-plugin/common';
import { DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';

import panelsJson from './static_by_value_example_panels.json';

export const StaticByValueExample = ({
  dashboardId,
  embeddableService,
}: {
  dashboardId?: string;
  embeddableService: EmbeddableStart;
}) => {
  return dashboardId ? (
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
          getCreationOptions={() => {
            console.log(panelsJson);
            return {
              initialInput: {
                timeRange: { from: 'now-30d', to: 'now' },
                viewMode: ViewMode.VIEW,
                panels: panelsJson as DashboardPanelMap,
              },
            }; // no special creation options - just loading a saved object
          }}
          onDashboardContainerLoaded={(container) => {
            return; // this example is static, so don't need to do anything with the dashboard container
          }}
        />
      </EuiPanel>
    </>
  ) : (
    <div>Ensure that the web logs sample dashboard is loaded to view this example.</div>
  );
};
