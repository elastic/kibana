/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import useAsync from 'react-use/lib/useAsync';
import React, { useEffect, useState } from 'react';

import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import { EuiLoadingSpinner, EuiSelectable, EuiSelectableOption, EuiSpacer } from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';

interface Props {
  onDashboardSelected: (selectedDashboard: DashboardItem) => void;
}

export const NavigationEmbeddableDashboardList = ({ onDashboardSelected, ...other }: Props) => {
  const navEmbeddable = useNavigationEmbeddable();
  const currentDashboardId = navEmbeddable.select(
    (state) => state.componentState.currentDashboardId
  );

  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await navEmbeddable.fetchDashboardList();
  }, []);

  useEffect(() => {
    const dashboardOptions =
      dashboardList?.map((dashboard: DashboardItem) => {
        return {
          data: dashboard,
          className: classNames({
            'navEmbeddable-currentDashboard': dashboard.id === currentDashboardId,
          }),
          label: dashboard.attributes.title,
        };
      }) ?? [];
    setDashboardListOptions(dashboardOptions);
  }, [dashboardList, currentDashboardId, onDashboardSelected]);

  return loadingDashboardList ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiSelectable
      {...other} // needed so that it's treated as part of the form
      searchable // will need our own implementation of search, since we can't fetch **all** dashboards in one go
      singleSelection={'always'}
      options={dashboardListOptions}
      onChange={(newOptions, _, selected) => {
        onDashboardSelected(selected.data as DashboardItem);
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
