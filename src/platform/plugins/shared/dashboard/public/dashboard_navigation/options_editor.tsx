/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import type { DashboardNavigationOptions } from '../../server';

export interface Props {
  options: DashboardNavigationOptions;
  onOptionChange: (newOptions: Partial<DashboardNavigationOptions>) => void;
}

export const DashboardNavigationOptionsEditor = ({ options, onOptionChange }: Props) => {
  return (
    <EuiFormRow data-test-subj="dashboardNavigationOptions">
      <div>
        <EuiSwitch
          compressed
          name="useFilters"
          label={i18n.translate('dashboard.navigationOptions.useFiltersLabel', {
            defaultMessage: 'Use filters and query from origin dashboard',
          })}
          checked={options.use_filters}
          onChange={() => onOptionChange({ use_filters: !options.use_filters })}
          data-test-subj="dashboardNavigationOptions--useFilters--checkbox"
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          name="useTimeRange"
          label={i18n.translate('dashboard.navigationOptions.useTimeRange', {
            defaultMessage: 'Use date range from origin dashboard',
          })}
          checked={options.use_time_range}
          onChange={() => onOptionChange({ use_time_range: !options.use_time_range })}
          data-test-subj="dashboardNavigationOptions--useTimeRange--checkbox"
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          name="openInNewTab"
          label={i18n.translate('dashboard.navigationOptions.openInNewTab', {
            defaultMessage: 'Open dashboard in new tab',
          })}
          checked={options.open_in_new_tab}
          onChange={() => onOptionChange({ open_in_new_tab: !options.open_in_new_tab })}
          data-test-subj="dashboardNavigationOptions--openInNewTab--checkbox"
        />
      </div>
    </EuiFormRow>
  );
};
