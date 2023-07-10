/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import useAsync from 'react-use/lib/useAsync';
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiBadge,
  EuiSpacer,
  EuiHighlight,
  EuiSelectable,
  EuiFieldSearch,
  EuiSelectableOption,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { DashboardItem } from '../../embeddable/types';
import { memoizedFetchDashboards } from './dashboard_link_tools';
import { DashboardLinkEmbeddableStrings } from './dashboard_link_strings';

export const DashboardLinkDestinationPicker = ({
  setDestination,
  setPlaceholder,
  parentDashboard,
  initialSelection,
  ...other
}: {
  setDestination: (destination?: string) => void;
  setPlaceholder: (placeholder?: string) => void;
  parentDashboard?: DashboardContainer;
  initialSelection?: string;
}) => {
  const [searchString, setSearchString] = useState<string>('');
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const parentDashboardId = parentDashboard?.select((state) => state.componentState.lastSavedId);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await memoizedFetchDashboards({
      search: searchString,
      currentDashboardId: parentDashboardId,
      selectedDashboardId: initialSelection,
    });
  }, [searchString, parentDashboardId]);

  useEffect(() => {
    const dashboardOptions =
      (dashboardList ?? []).map((dashboard: DashboardItem) => {
        if (dashboard.id === initialSelection) setSelectedDashboard(dashboard);
        return {
          data: dashboard,
          label: dashboard.attributes.title,
          checked: dashboard.id === initialSelection ? 'on' : undefined,
          ...(dashboard.id === parentDashboardId
            ? {
                prepend: (
                  <EuiBadge>{DashboardLinkEmbeddableStrings.getCurrentDashboardLabel()}</EuiBadge>
                ),
              }
            : {}),
        } as EuiSelectableOption;
      }) ?? [];

    setDashboardListOptions(dashboardOptions);
  }, [dashboardList, parentDashboardId, initialSelection, searchString]);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((newSearch: string) => {
        setSearchString(newSearch);
      }, 250),
    [setSearchString]
  );

  useEffect(() => {
    if (selectedDashboard) {
      setDestination(selectedDashboard.id);
      setPlaceholder(selectedDashboard.attributes.title);
    } else {
      setDestination(undefined);
      setPlaceholder(undefined);
    }
  }, [selectedDashboard, setDestination, setPlaceholder]);

  /* {...other} is needed so all inner elements are treated as part of the form */
  return (
    <div {...other}>
      <EuiFieldSearch
        isClearable={true}
        placeholder={DashboardLinkEmbeddableStrings.getSearchPlaceholder()}
        onChange={(e) => {
          debouncedSetSearch(e.target.value);
        }}
      />
      <EuiSpacer size="s" />
      <EuiSelectable
        singleSelection={true}
        options={dashboardListOptions}
        isLoading={loadingDashboardList}
        listProps={{ onFocusBadge: false, bordered: true, isVirtualized: true }}
        aria-label={DashboardLinkEmbeddableStrings.getDashboardPickerAriaLabel()}
        onChange={(newOptions, _, selected) => {
          if (selected.checked) {
            setSelectedDashboard(selected.data as DashboardItem);
          } else {
            setSelectedDashboard(undefined);
          }
          setDashboardListOptions(newOptions);
        }}
        renderOption={(option) => {
          return <EuiHighlight search={searchString}>{option.label}</EuiHighlight>;
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </div>
  );
};
