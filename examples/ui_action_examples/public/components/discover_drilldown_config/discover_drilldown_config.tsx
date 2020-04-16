/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { txtChooseDestinationIndexPattern } from './i18n';

export interface IndexPatternItem {
  id: string;
  title: string;
}

export interface DiscoverDrilldownConfigProps {
  activeDashboardId?: string;
  dashboards: IndexPatternItem[];
  currentFilters?: boolean;
  keepRange?: boolean;
  onDashboardSelect: (dashboardId: string) => void;
  onCurrentFiltersToggle?: () => void;
  onKeepRangeToggle?: () => void;
}

export const DiscoverDrilldownConfig: React.FC<DiscoverDrilldownConfigProps> = ({
  activeDashboardId,
  dashboards,
  currentFilters,
  keepRange,
  onDashboardSelect,
  onCurrentFiltersToggle,
  onKeepRangeToggle,
}) => {
  return (
    <>
      <EuiFormRow label={txtChooseDestinationIndexPattern}>
        <EuiSelect
          name="selectDashboard"
          hasNoInitialSelection={true}
          options={dashboards.map(({ id, title }) => ({ value: id, text: title }))}
          value={activeDashboardId}
          onChange={e => onDashboardSelect(e.target.value)}
        />
      </EuiFormRow>
      {!!onCurrentFiltersToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentFilters"
            label="Use current dashboard's filters"
            checked={!!currentFilters}
            onChange={onCurrentFiltersToggle}
          />
        </EuiFormRow>
      )}
      {!!onKeepRangeToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentDateRange"
            label="Use current dashboard's date range"
            checked={!!keepRange}
            onChange={onKeepRangeToggle}
          />
        </EuiFormRow>
      )}
    </>
  );
};
