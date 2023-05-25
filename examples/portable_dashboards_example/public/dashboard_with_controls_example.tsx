/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { controlGroupInputBuilder } from '@kbn/controls-plugin/public';
import { getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import { FILTER_DEBUGGER_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardRenderer,
  DashboardCreationOptions,
} from '@kbn/dashboard-plugin/public';

export const DashboardWithControlsExample = ({ dataView }: { dataView: DataView }) => {
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();

  // add a filter debugger panel as soon as the dashboard becomes available
  useEffect(() => {
    if (!dashboard) return;
    (async () => {
      const embeddable = await dashboard.addNewEmbeddable(FILTER_DEBUGGER_EMBEDDABLE, {});
      const prevPanelState = dashboard.getExplicitInput().panels[embeddable.id];
      // resize the new panel so that it fills up the entire width of the dashboard
      dashboard.updateInput({
        panels: {
          [embeddable.id]: {
            ...prevPanelState,
            gridData: { i: embeddable.id, x: 0, y: 0, w: 48, h: 12 },
          },
        },
      });
    })();
  }, [dashboard]);

  return (
    <>
      <EuiTitle>
        <h2>Dashboard with controls example</h2>
      </EuiTitle>
      <EuiText>
        <p>A dashboard with a markdown panel that displays the filters from its control group.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <DashboardRenderer
          getCreationOptions={async (): Promise<DashboardCreationOptions> => {
            const builder = controlGroupInputBuilder;
            const controlGroupInput = getDefaultControlGroupInput();
            await builder.addDataControlFromField(controlGroupInput, {
              dataViewId: dataView.id ?? '',
              title: 'Destintion country',
              fieldName: 'geo.dest',
              width: 'medium',
              grow: false,
            });
            await builder.addDataControlFromField(controlGroupInput, {
              dataViewId: dataView.id ?? '',
              fieldName: 'bytes',
              width: 'medium',
              grow: true,
              title: 'Bytes',
            });

            return {
              useControlGroupIntegration: true,
              getInitialInput: () => ({
                timeRange: { from: 'now-30d', to: 'now' },
                viewMode: ViewMode.VIEW,
                controlGroupInput,
              }),
            };
          }}
          ref={setDashboard}
        />
      </EuiPanel>
    </>
  );
};
