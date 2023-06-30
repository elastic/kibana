/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { EuiButtonEmpty } from '@elastic/eui';
import { useDashboardLinkEmbeddable } from '../embeddable/dashboard_link_embeddable';

export const DashboardLinkComponent = () => {
  const embeddable = useDashboardLinkEmbeddable();
  const parentDashboard = embeddable.getRoot() as DashboardContainer;

  const isLoading = embeddable.select((state) => state.output.loading);

  const dashboardLinkLabel = embeddable.select((state) => state.explicitInput.label);
  const dashboardLinkId = embeddable.select((state) => state.explicitInput.dashboardId);
  const dashboardTitle = embeddable.select((state) => state.componentState.dashboardTitle);

  const parentDashboardTitle = parentDashboard.select((state) => state.explicitInput.title);
  const parentDashboardId = parentDashboard.select((state) => state.componentState.lastSavedId);

  return (
    <EuiButtonEmpty
      id={'test1' + embeddable.id}
      isLoading={isLoading}
      iconType="dashboardApp"
      {...(dashboardLinkId === parentDashboardId
        ? {
            color: 'text',
          }
        : {
            color: 'primary',
            onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
          })}
    >
      {dashboardLinkLabel || dashboardLinkId === parentDashboardId
        ? parentDashboardTitle
        : dashboardTitle}
    </EuiButtonEmpty>
  );
};
