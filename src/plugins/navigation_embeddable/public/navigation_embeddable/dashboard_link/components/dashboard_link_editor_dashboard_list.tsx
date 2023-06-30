/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useAsync from 'react-use/lib/useAsync';
import React, { useEffect, useState } from 'react';

import {
  EuiBadge,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiHighlight,
  EuiSelectable,
  EuiFieldSearch,
  EuiSelectableOption,
} from '@elastic/eui';
import { fetchDashboardList } from '../lib/fetch_dashboards';
import { DashboardItem } from '../types';
import { NavEmbeddableStrings } from '../../navigation_container/components/navigation_embeddable_strings';

interface Props {
  currentDashboardId?: string;
  setSelectedDashboard: (selectedDashboard?: DashboardItem) => void;
}

export const DashboardLinkEditorDashboardList = ({
  currentDashboardId,
  setSelectedDashboard,
  ...other
}: Props) => {
  const [searchString, setSearchString] = useState<string>('');
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await fetchDashboardList(searchString, undefined, currentDashboardId);
  }, [searchString]);

  useEffect(() => {
    const dashboardOptions =
      (dashboardList ?? []).map((dashboard: DashboardItem) => {
        return {
          data: dashboard,
          label: dashboard.attributes.title,
          // checked: initialSelection && initialSelection.id === dashboard.id ? 'on' : undefined,
        } as EuiSelectableOption;
      }) ?? [];

    setDashboardListOptions(dashboardOptions);
  }, [dashboardList, searchString]);

  // {...other} is needed so all inner elements are treated as part of the form
  return (
    <div {...other}>
      <EuiFieldSearch
        isClearable={true}
        placeholder={NavEmbeddableStrings.editor.dashboard.getSearchPlaceholder()}
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
          setSelectedDashboard(selected.checked ? (selected.data as DashboardItem) : undefined);
          setDashboardListOptions(newOptions);
        }}
        listProps={{ onFocusBadge: false, bordered: true, isVirtualized: true }}
        renderOption={(option) => {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiHighlight search={searchString}>{option.label}</EuiHighlight>
              </EuiFlexItem>
              {option.id === currentDashboardId && (
                <EuiFlexItem grow={false}>
                  <EuiBadge>
                    {NavEmbeddableStrings.editor.dashboard.getCurrentDashboardLabel()}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </div>
  );
};
