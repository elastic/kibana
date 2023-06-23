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
import {
  EuiSpacer,
  EuiSelectable,
  EuiLoadingSpinner,
  EuiSelectableOption,
  EuiFieldSearch,
  EuiHighlight,
} from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';

interface Props {
  onDashboardSelected: (selectedDashboard: DashboardItem) => void;
}

export const NavigationEmbeddableDashboardList = ({ onDashboardSelected, ...other }: Props) => {
  const navEmbeddable = useNavigationEmbeddable();
  const currentDashboardId = navEmbeddable.select(
    (state) => state.componentState.currentDashboardId
  );

  const [searchString, setSearchString] = useState<string>('');
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await navEmbeddable.fetchDashboardList(searchString);
  }, [searchString]);

  useEffect(() => {
    const dashboardOptions =
      dashboardList?.map((dashboard: DashboardItem) => {
        return {
          data: dashboard, // just store the ID here - that's all that is necessary
          className: classNames({
            'navEmbeddable-currentDashboard': dashboard.id === currentDashboardId,
          }),
          label: dashboard.attributes.title,
        } as EuiSelectableOption;
      }) ?? [];
    setDashboardListOptions(dashboardOptions);
  }, [dashboardList, currentDashboardId, onDashboardSelected]);

  // {...other} is needed so all inner elements are treated as part of the form
  return (
    <div {...other}>
      <EuiFieldSearch
        isClearable={true}
        placeholder={'Search for a dashboard or enter external URL'}
        onSearch={(value) => {
          setSearchString(value);
        }}
      />
      <EuiSpacer size="s" />
      <EuiSelectable
        singleSelection={true}
        options={dashboardListOptions}
        isLoading={loadingDashboardList}
        onChange={(newOptions, _, selected) => {
          onDashboardSelected(selected.data as DashboardItem);
          setDashboardListOptions(newOptions);
        }}
        listProps={{ onFocusBadge: false, bordered: true, isVirtualized: true }}
        renderOption={(option) => <EuiHighlight search={searchString}>{option.label}</EuiHighlight>}
      >
        {(list) => list}
      </EuiSelectable>
    </div>
  );
};
