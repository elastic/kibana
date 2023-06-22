/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { EuiLoadingSpinner, EuiSelectable, EuiSelectableOption, EuiSpacer } from '@elastic/eui';

import { SelectedDashboard } from '../types';
import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';

interface Props {
  // embeddable: NavigationEmbeddable;
  onDashboardSelected: (selectedDashboard: { title: string; id: string }) => void;
}

export const NavigationEmbeddableDashboardList = ({
  // embeddable,
  onDashboardSelected,
  ...other
}: Props) => {
  const navigationEmbeddable = useNavigationEmbeddable();

  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await navigationEmbeddable.getDashboardList();
  }, []);

  useEffect(() => {
    let currentDashboardOption: EuiSelectableOption | undefined;
    if (dashboardList?.currentDashboard) {
      currentDashboardOption = {
        checked: 'on',
        data: {
          id: dashboardList.currentDashboard.id,
          title: dashboardList.currentDashboard.attributes.title,
        },
        label: dashboardList.currentDashboard.attributes.title,
        css: {
          fontWeight: 'bold',
        },
      };
      onDashboardSelected(currentDashboardOption.data as SelectedDashboard);
    }

    const otherDashboardOptions =
      dashboardList?.otherDashboards.map((dashboard) => ({
        data: { id: dashboard.id, title: dashboard.attributes.title },
        label: dashboard.attributes.title,
      })) ?? [];
    setDashboardListOptions(
      currentDashboardOption
        ? [currentDashboardOption, ...otherDashboardOptions]
        : otherDashboardOptions
    );
  }, [dashboardList, onDashboardSelected]);

  return loadingDashboardList ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiSelectable
      {...other} // needed so that it's treated as part of the form
      searchable // will need our own implementation of search, since we can't fetch **all** dashboards in one go
      singleSelection={'always'}
      options={dashboardListOptions}
      onChange={(newOptions, _, selected) => {
        onDashboardSelected(selected.data as SelectedDashboard);
        setDashboardListOptions(newOptions);
      }}
      listProps={{ onFocusBadge: false, bordered: true, isVirtualized: true }}
    >
      {(list, search) => (
        <>
          {search}
          <EuiSpacer size="s" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};
