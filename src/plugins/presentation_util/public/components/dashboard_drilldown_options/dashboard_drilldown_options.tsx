/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { DashboardDrilldownOptions } from './types';
import { dashboardDrilldownConfigStrings } from '../../i18n/dashboard_drilldown_config';

export interface DashboardDrilldownOptionsProps {
  options: DashboardDrilldownOptions;
  onOptionChange: (newOptions: Partial<DashboardDrilldownOptions>) => void;
}

const DashboardDrilldownOptionsComponent = ({
  options,
  onOptionChange,
}: DashboardDrilldownOptionsProps) => {
  return (
    <>
      {options.useCurrentFilters !== undefined && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentFilters"
            label={dashboardDrilldownConfigStrings.component.getUseCurrentFiltersLabel()}
            checked={!!options.useCurrentFilters}
            onChange={() => onOptionChange({ useCurrentFilters: !options.useCurrentFilters })}
          />
        </EuiFormRow>
      )}
      {options.useCurrentDateRange !== undefined && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentDateRange"
            label={dashboardDrilldownConfigStrings.component.getUseCurrentDateRange()}
            checked={!!options.useCurrentDateRange}
            onChange={() => onOptionChange({ useCurrentDateRange: !options.useCurrentDateRange })}
          />
        </EuiFormRow>
      )}
      {options.openInNewTab !== undefined && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="openInNewTab"
            label={dashboardDrilldownConfigStrings.component.getOpenInNewTab()}
            checked={!!options.openInNewTab}
            onChange={() => onOptionChange({ openInNewTab: !options.openInNewTab })}
          />
        </EuiFormRow>
      )}
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default DashboardDrilldownOptionsComponent;
