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

import { LinkEditorDestinationProps } from '../../navigation_container/types';
import { DashboardItem, DashboardLinkInput } from '../types';
import { DashboardLinkEmbeddableStrings } from './dashboard_link_strings';
import { memoizedFetchDashboards } from '../lib/dashboard_editor_tools';

export const DashboardLinkEditorDestinationPicker = ({
  setDestination,
  setPlaceholder,
  currentDashboardId,
  ...other
}: LinkEditorDestinationProps<DashboardLinkInput>) => {
  const [searchString, setSearchString] = useState<string>('');
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await memoizedFetchDashboards(searchString, undefined, currentDashboardId);
  }, [searchString]);

  useEffect(() => {
    const dashboardOptions =
      (dashboardList ?? []).map((dashboard: DashboardItem) => {
        return {
          data: dashboard,
          label: dashboard.attributes.title,
        } as EuiSelectableOption;
      }) ?? [];

    setDashboardListOptions(dashboardOptions);
  }, [dashboardList, searchString]);

  // {...other} is needed so all inner elements are treated as part of the form
  return (
    <div {...other}>
      <EuiFieldSearch
        isClearable={true}
        placeholder={DashboardLinkEmbeddableStrings.getSearchPlaceholder()}
        onSearch={(value) => {
          setSearchString(value);
        }}
      />
      <EuiSpacer size="s" />
      <EuiSelectable
        aria-label={DashboardLinkEmbeddableStrings.getDashboardPickerAriaLabel()}
        singleSelection={true}
        options={dashboardListOptions}
        isLoading={loadingDashboardList}
        onChange={(newOptions, _, selected) => {
          if (selected.checked) {
            setDestination((selected.data as DashboardItem).id);
            setPlaceholder((selected.data as DashboardItem).attributes.title);
          } else {
            setDestination(undefined);
            setPlaceholder(undefined);
          }
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
                  <EuiBadge>{DashboardLinkEmbeddableStrings.getCurrentDashboardLabel()}</EuiBadge>
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
