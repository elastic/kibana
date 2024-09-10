/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  AwaitingDashboardAPI,
  DashboardAPI,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';

export const DualReduxExample = () => {
  const [firstDashboardContainer, setFirstDashboardContainer] = useState<AwaitingDashboardAPI>();
  const [secondDashboardContainer, setSecondDashboardContainer] = useState<AwaitingDashboardAPI>();

  const ButtonControls = ({ dashboard }: { dashboard: DashboardAPI }) => {
    const viewMode = dashboard.select((state) => state.explicitInput.viewMode);

    return (
      <EuiButtonGroup
        legend="View mode"
        options={[
          {
            id: ViewMode.VIEW,
            label: 'View mode',
            value: ViewMode.VIEW,
          },
          {
            id: ViewMode.EDIT,
            label: 'Edit mode',
            value: ViewMode.EDIT,
          },
        ]}
        idSelected={viewMode}
        onChange={(id, value) => dashboard.dispatch.setViewMode(value)}
        type="single"
      />
    );
  };

  return (
    <>
      <EuiTitle>
        <h2>Dual redux example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Use the redux contexts from two different dashboard containers to independently set the
          view mode of each dashboard.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Dashboard #1</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {firstDashboardContainer && <ButtonControls dashboard={firstDashboardContainer} />}
            <EuiSpacer size="m" />
            <DashboardRenderer ref={setFirstDashboardContainer} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Dashboard #2</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {secondDashboardContainer && <ButtonControls dashboard={secondDashboardContainer} />}
            <EuiSpacer size="m" />
            <DashboardRenderer ref={setSecondDashboardContainer} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
