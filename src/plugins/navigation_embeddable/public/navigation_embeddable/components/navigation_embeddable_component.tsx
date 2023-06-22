/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiListGroup, EuiListGroupItemProps, EuiPanel } from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableDashboardPicker } from './navigation_embeddable_dashboard_picker';

import './navigation_embeddable.scss';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const selectedDashboards = navEmbeddable.select((state) => state.explicitInput.dashboardLinks);
  const currentDashboardId = navEmbeddable.select(
    (state) => state.componentState.currentDashboardId
  );

  const [dashboardListGroupItems, setDashboardListGroupItems] = useState<EuiListGroupItemProps[]>(
    []
  );

  useEffect(() => {
    setDashboardListGroupItems(
      (selectedDashboards ?? []).map((dashboard) => {
        return {
          label: dashboard.attributes.title,
          iconType: 'dashboardApp',
          color: dashboard.id === currentDashboardId ? 'text' : 'primary',
        };
      })
    );
  }, [selectedDashboards, currentDashboardId]);

  return (
    <EuiPanel>
      <EuiListGroup flush listItems={dashboardListGroupItems} size="s" />
      <NavigationEmbeddableDashboardPicker />
    </EuiPanel>
  );
};
