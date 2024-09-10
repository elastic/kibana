/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import useAsync from 'react-use/lib/useAsync';
import useMount from 'react-use/lib/useMount';
import useUnmount from 'react-use/lib/useUnmount';
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiBadge,
  EuiComboBox,
  EuiFlexItem,
  EuiHighlight,
  EuiFlexGroup,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { DashboardItem } from '../../types';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { fetchDashboard, fetchDashboards } from './dashboard_link_tools';

type DashboardComboBoxOption = EuiComboBoxOptionOption<DashboardItem>;

export const DashboardLinkDestinationPicker = ({
  onDestinationPicked,
  initialSelection,
  parentDashboardId,
  onUnmount,
  ...other
}: {
  initialSelection?: string;
  parentDashboardId?: string;
  onUnmount: (dashboardId?: string) => void;
  onDestinationPicked: (selectedDashboard?: DashboardItem) => void;
}) => {
  const [searchString, setSearchString] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<DashboardComboBoxOption[]>([]);

  const getDashboardItem = useCallback((dashboard: DashboardItem) => {
    return {
      key: dashboard.id,
      value: dashboard,
      label: dashboard.attributes.title,
      className: 'linksDashboardItem',
    };
  }, []);

  useMount(async () => {
    if (initialSelection) {
      const dashboard = await fetchDashboard(initialSelection).catch(() => {
        /**
         * Swallow the error that is thrown, since this just means the selected dashboard was deleted and
         * so we should treat this the same as "no previous selection."
         */
      });
      if (dashboard) {
        onDestinationPicked(dashboard);
        setSelectedOption([getDashboardItem(dashboard)]);
      } else {
        onDestinationPicked(undefined);
      }
    }
  });

  useUnmount(() => {
    /** Save the current selection so we can re-populate it if we switch back to this link editor */
    onUnmount(selectedOption[0]?.key);
  });

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    const dashboards = await fetchDashboards({
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
    (option: DashboardComboBoxOption, searchValue: string, contentClassName: string) => {
      const { label, key: dashboardId } = option;
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" className={contentClassName}>
          {dashboardId === parentDashboardId && (
            <EuiFlexItem grow={false}>
              <EuiBadge>{DashboardLinkStrings.getCurrentDashboardLabel()}</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem className={'linksPanelEditorLinkText'}>
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
      className={'linksDashboardPicker'}
      isLoading={loadingDashboardList}
      aria-label={DashboardLinkStrings.getDashboardPickerAriaLabel()}
      placeholder={DashboardLinkStrings.getDashboardPickerPlaceholder()}
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
        } else {
          onDestinationPicked(undefined);
        }
      }}
      data-test-subj="links--linkEditor--dashboardLink--comboBox"
    />
  );
};
