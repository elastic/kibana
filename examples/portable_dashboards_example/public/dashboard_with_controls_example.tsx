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
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { controlGroupStateBuilder } from '@kbn/control-group-renderer';
import type { ControlGroupRuntimeState } from '@kbn/control-group-renderer';
import { FILTER_DEBUGGER_EMBEDDABLE_ID } from './constants';
import type { StartDeps } from './plugin';

const toPinnedPanels = (
  controlGroupState: Partial<ControlGroupRuntimeState>
): DashboardState['pinned_panels'] => {
  return Object.entries(controlGroupState.initialChildControlState ?? {})
    .sort(([, controlA], [, controlB]) => controlA.order - controlB.order)
    .map(([id, control]) => {
      const { grow, order: _order, type, width, ...config } = control;
      return {
        id,
        type,
        ...(grow !== undefined ? { grow } : {}),
        ...(width !== undefined ? { width } : {}),
        config,
      };
    }) as DashboardState['pinned_panels'];
};

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
            const controlGroupState: Partial<ControlGroupRuntimeState> = {};
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
                time_range: { from: 'now-30d', to: 'now' },
                viewMode: 'view',
                pinned_panels: toPinnedPanels(controlGroupState),
              }),
            };
          }}
          onApiAvailable={setDashboard}
        />
      </EuiPanel>
    </>
  );
};
