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
import { controlGroupStateBuilder } from '@kbn/controls-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardRenderer,
  DashboardCreationOptions,
} from '@kbn/dashboard-plugin/public';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { FILTER_DEBUGGER_EMBEDDABLE_ID } from './constants';

export const DashboardWithControlsExample = ({ dataView }: { dataView: DataView }) => {
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();

  // add a filter debugger panel as soon as the dashboard becomes available
  useEffect(() => {
    if (!dashboard) return;
    (async () => {
      const api = await dashboard.addNewPanel(
        {
          panelType: FILTER_DEBUGGER_EMBEDDABLE_ID,
          initialState: {},
        },
        true
      );
      if (!apiHasUniqueId(api)) {
        return;
      }
      const prevPanelState = dashboard.getExplicitInput().panels[api.uuid];
      // resize the new panel so that it fills up the entire width of the dashboard
      dashboard.updateInput({
        panels: {
          [api.uuid]: {
            ...prevPanelState,
            gridData: { i: api.uuid, x: 0, y: 0, w: 48, h: 12 },
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
            const controlGroupState = {};
            await controlGroupStateBuilder.addDataControlFromField(controlGroupState, {
              dataViewId: dataView.id ?? '',
              title: 'Destintion country',
              fieldName: 'geo.dest',
              width: 'medium',
              grow: false,
            });
            await controlGroupStateBuilder.addDataControlFromField(controlGroupState, {
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
                controlGroupState,
              }),
            };
          }}
          ref={setDashboard}
        />
      </EuiPanel>
    </>
  );
};
