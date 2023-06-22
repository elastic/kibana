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

export const NavigationEmbeddableComponent = () => {
  const navigationEmbeddable = useNavigationEmbeddable();

  const selectedDashboards = navigationEmbeddable.select(
    (state) => state.explicitInput.dashboardLinks
  );

  const [dashboardListGroupItems, setDashboardListGroupItems] = useState<EuiListGroupItemProps[]>(
    []
  );

  useEffect(() => {
    console.log('selectedDashboards', selectedDashboards);
    setDashboardListGroupItems(
      (selectedDashboards ?? []).map((link) => {
        return {
          label: link.title,
          iconType: 'dashboardApp',
        };
      })
    );
  }, [selectedDashboards]);

  return (
    <EuiPanel>
      <EuiListGroup flush listItems={dashboardListGroupItems} color="text" size="s" />
      <NavigationEmbeddableDashboardPicker />
    </EuiPanel>
  );
};
