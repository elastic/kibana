/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import useAsync from 'react-use/lib/useAsync';
import useMount from 'react-use/lib/useMount';
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiBadge,
  EuiSpacer,
  EuiHighlight,
  EuiSelectable,
  EuiFieldSearch,
  EuiSelectableOption,
  EuiInputPopover,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { DashboardItem } from '../../embeddable/types';
import { memoizedFetchDashboard, memoizedFetchDashboards } from './dashboard_link_tools';
import { DashboardLinkEmbeddableStrings } from './dashboard_link_strings';

export const DashboardLinkDestinationPicker = ({
  onDestinationPicked,
  initialSelection,
  parentDashboard,
  ...other
}: {
  onDestinationPicked: (selectedDashboard?: DashboardItem) => void;
  parentDashboard?: DashboardContainer;
  initialSelection?: string;
}) => {
  const [searchString, setSearchString] = useState<string>('');
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiComboBoxOptionOption[]>([]);

  const parentDashboardId = parentDashboard?.select((state) => state.componentState.lastSavedId);

  useMount(async () => {
    if (initialSelection) {
      onDestinationPicked(await memoizedFetchDashboard(initialSelection));
    }
  });

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await memoizedFetchDashboards({
      search: searchString,
      parentDashboardId,
      selectedDashboardId: initialSelection,
    });
  }, [searchString, parentDashboardId]);

  useEffect(() => {
    const dashboardOptions =
      (dashboardList ?? []).map((dashboard: DashboardItem) => {
        return {
          data: dashboard,
          label: dashboard.attributes.title,
          ...(dashboard.id === parentDashboardId
            ? {
                prepend: (
                  <EuiBadge>{DashboardLinkEmbeddableStrings.getCurrentDashboardLabel()}</EuiBadge>
                ),
              }
            : {}),
        } as EuiComboBoxOptionOption;
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

  /* {...other} is needed so all inner elements are treated as part of the form */
  return (
    <div {...other}>
      <EuiComboBox
        fullWidth
        aria-label="Accessible screen reader label"
        placeholder="Select a single option"
        singleSelection={{ asPlainText: true }}
        options={dashboardListOptions}
        // selectedOptions={selectedOptions}
        // onChange={onChange}
        customOptionText="Add {searchValue} as your occupation"
      />
      {/* <EuiFieldSearch
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
            onDestinationPicked(selected.data as DashboardItem);
          } else {
            onDestinationPicked(undefined);
          }
          setDashboardListOptions(newOptions);
        }}
        renderOption={(option) => {
          return <EuiHighlight search={searchString}>{option.label}</EuiHighlight>;
        }}
      >
        {(list) => list}
      </EuiSelectable> */}
    </div>
  );
};
