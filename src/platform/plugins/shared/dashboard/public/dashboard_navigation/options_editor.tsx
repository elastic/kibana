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
          name="useCurrentFilters"
          label={i18n.translate('dashboard.navigationOptions.useCurrentFiltersLabel', {
            defaultMessage: 'Use filters and query from origin dashboard',
          })}
          checked={options.useCurrentFilters}
          onChange={() => onOptionChange({ useCurrentFilters: !options.useCurrentFilters })}
          data-test-subj="dashboardNavigationOptions--useCurrentFilters--checkbox"
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          name="useCurrentDateRange"
          label={i18n.translate('dashboard.navigationOptions.useCurrentDateRange', {
            defaultMessage: 'Use date range from origin dashboard',
          })}
          checked={options.useCurrentDateRange}
          onChange={() => onOptionChange({ useCurrentDateRange: !options.useCurrentDateRange })}
          data-test-subj="dashboardNavigationOptions--useCurrentDateRange--checkbox"
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          name="openInNewTab"
          label={i18n.translate('dashboard.navigationOptions.openInNewTab', {
            defaultMessage: 'Open dashboard in new tab',
          })}
          checked={options.openInNewTab}
          onChange={() => onOptionChange({ openInNewTab: !options.openInNewTab })}
          data-test-subj="dashboardNavigationOptions--openInNewTab--checkbox"
        />
      </div>
    </EuiFormRow>
  );
};
