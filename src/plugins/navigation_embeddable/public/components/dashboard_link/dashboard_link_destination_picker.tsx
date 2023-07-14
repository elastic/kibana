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
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiBadge,
  EuiComboBox,
  EuiFlexItem,
  EuiHighlight,
  EuiFlexGroup,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { DashboardItem } from '../../embeddable/types';
import { memoizedFetchDashboard, memoizedFetchDashboards } from './dashboard_link_tools';
import { DashboardLinkEmbeddableStrings } from './dashboard_link_strings';

type DashboardComboBoxOption = EuiComboBoxOptionOption<DashboardItem>;

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
  const [selectedOption, setSelectedOption] = useState<DashboardComboBoxOption[]>([]);

  const parentDashboardId = parentDashboard?.select((state) => state.componentState.lastSavedId);

  const getDashboardItem = useCallback((dashboard: DashboardItem) => {
    return {
      key: dashboard.id,
      value: dashboard,
      label: dashboard.attributes.title,
      className: 'navEmbeddableDashboardItem',
    };
  }, []);

  useMount(async () => {
    if (initialSelection) {
      const dashboard = await memoizedFetchDashboard(initialSelection);
      onDestinationPicked(dashboard);
      setSelectedOption([getDashboardItem(dashboard)]);
    }
  });

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    const dashboards = await memoizedFetchDashboards({
      search: searchString,
      parentDashboardId,
      selectedDashboardId: initialSelection,
    });
    const dashboardOptions = (dashboards ?? []).map((dashboard: DashboardItem) => {
      return getDashboardItem(dashboard);
    });
    return dashboardOptions;
  }, [searchString, parentDashboardId, getDashboardItem]);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((newSearch: string) => {
        setSearchString(newSearch);
      }, 250),
    [setSearchString]
  );

  const renderOption = useCallback(
    (option, searchValue, contentClassName) => {
      const { label, key: dashboardId } = option;
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" className={contentClassName}>
          {dashboardId === parentDashboardId && (
            <EuiFlexItem grow={false}>
              <EuiBadge>{DashboardLinkEmbeddableStrings.getCurrentDashboardLabel()}</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem className={'navEmbeddableLinkText'}>
            <EuiHighlight search={searchValue} className={'wrapText'}>
              {label}
            </EuiHighlight>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [parentDashboardId]
  );

  /* {...other} is needed so the EuiComboBox is treated as part of the form */
  return (
    <EuiComboBox
      {...other}
      async
      fullWidth
      className={'navEmbeddableDashboardPicker'}
      isLoading={loadingDashboardList}
      aria-label={DashboardLinkEmbeddableStrings.getDashboardPickerAriaLabel()}
      placeholder={DashboardLinkEmbeddableStrings.getDashboardPickerPlaceholder()}
      singleSelection={{ asPlainText: true }}
      options={dashboardList}
      onSearchChange={(searchValue) => {
        debouncedSetSearch(searchValue);
      }}
      renderOption={renderOption}
      selectedOptions={selectedOption}
      onChange={(option) => {
        setSelectedOption(option);
        if (option.length > 0) {
          // single select is `true`, so there is only ever one item in the array
          onDestinationPicked(option[0].value);
        }
      }}
    />
  );
};
