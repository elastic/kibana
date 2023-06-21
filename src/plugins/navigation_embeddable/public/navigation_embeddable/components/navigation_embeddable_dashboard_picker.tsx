/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { EuiLoadingSpinner, EuiPanel, EuiSelectable, EuiSelectableOption } from '@elastic/eui';

import { NavigationEmbeddable } from '../embeddable/navigation_embeddable';

interface Props {
  embeddable: NavigationEmbeddable;
}

export const NavigationEmbeddableDashboardPicker = ({ embeddable }: Props) => {
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await embeddable.getDashboardList();
  }, []);

  useEffect(() => {
    const currentDashboardOption = dashboardList?.currentDashboard
      ? [
          {
            data: { id: dashboardList.currentDashboard.id },
            label: dashboardList.currentDashboard.attributes.title,
            css: {
              fontWeight: 'bold',
            },
          },
        ]
      : [];
    const otherDashboardOptions =
      dashboardList?.otherDashboards.map((dashboard) => ({
        data: { id: dashboard.id },
        label: dashboard.attributes.title,
      })) ?? [];
    setDashboardListOptions([...currentDashboardOption, ...otherDashboardOptions]);
  }, [dashboardList]);

  return loadingDashboardList ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiPanel>
      <EuiSelectable
        singleSelection={true}
        options={dashboardListOptions}
        listProps={{ onFocusBadge: false }}
        onChange={(newOptions) => setDashboardListOptions(newOptions)}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPanel>
  );
};
