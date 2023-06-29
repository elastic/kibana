/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { useDashboardLinkEmbeddable } from '../embeddable/dashboard_link_embeddable';

export const DashboardLinkComponent = () => {
  const embeddable = useDashboardLinkEmbeddable();

  const isLoading = embeddable.select((state) => state.output.loading);
  const dashboardLinkId = embeddable.select((state) => state.explicitInput.dashboardId);
  const dashboardLinkLabel = embeddable.select((state) => state.explicitInput.label);

  const dashboardTitle = embeddable.select((state) => state.componentState.dashboardTitle);
  const currentDashboardId = embeddable.select((state) => state.componentState.currentDashboardId);

  return (
    <EuiButtonEmpty
      isLoading={isLoading}
      iconType="dashboardApp"
      {...(dashboardLinkId === currentDashboardId
        ? {
            color: 'text',
          }
        : {
            color: 'primary',
            onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
          })}
    >
      {dashboardLinkLabel || dashboardTitle}
    </EuiButtonEmpty>
  );
};
