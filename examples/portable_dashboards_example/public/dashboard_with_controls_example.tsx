/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { controlGroupStateBuilder } from '@kbn/control-group-renderer';
import { FILTER_DEBUGGER_EMBEDDABLE_ID } from './constants';
import type { StartDeps } from './plugin';

export const DashboardWithControlsExample = ({
  dataView,
  uiActions,
}: {
  dataView: DataView;
  uiActions: StartDeps['uiActions'];
}) => {
  const [dashboard, setDashboard] = useState<DashboardApi | undefined>();

  // add a filter debugger panel as soon as the dashboard becomes available
  useEffect(() => {
    if (!dashboard) return;
    dashboard
      .addNewPanel(
        {
          panelType: FILTER_DEBUGGER_EMBEDDABLE_ID,
        },
        {
          displaySuccessMessage: true,
        }
      )
      .catch(() => {
        // ignore error - its an example
      });
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
            await controlGroupStateBuilder.addDataControlFromField(
              controlGroupState,
              {
                data_view_id: dataView.id ?? '',
                title: 'Destination country',
                field_name: 'geo.dest',
                width: 'medium',
                grow: false,
              },
              uiActions
            );
            await controlGroupStateBuilder.addDataControlFromField(
              controlGroupState,
              {
                data_view_id: dataView.id ?? '',
                field_name: 'bytes',
                width: 'medium',
                grow: true,
                title: 'Bytes',
              },
              uiActions
            );

            return {
              getInitialInput: () => ({
                timeRange: { from: 'now-30d', to: 'now' },
                viewMode: 'view',
                controlGroupState,
              }),
            };
          }}
          onApiAvailable={setDashboard}
        />
      </EuiPanel>
    </>
  );
};
