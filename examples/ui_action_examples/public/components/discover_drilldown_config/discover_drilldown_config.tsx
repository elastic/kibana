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
  indexPatterns: IndexPatternItem[];
  onDashboardSelect: (dashboardId: string) => void;
  carryFiltersAndQuery?: boolean;
  onCarryFiltersAndQueryToggle?: () => void;
  carryTimeRange?: boolean;
  onCarryTimeRangeToggle?: () => void;
}

export const DiscoverDrilldownConfig: React.FC<DiscoverDrilldownConfigProps> = ({
  activeDashboardId,
  indexPatterns,
  onDashboardSelect,
  carryFiltersAndQuery,
  onCarryFiltersAndQueryToggle,
  carryTimeRange,
  onCarryTimeRangeToggle,
}) => {
  return (
    <>
      <EuiFormRow label={txtChooseDestinationIndexPattern}>
        <EuiSelect
          name="selectDashboard"
          hasNoInitialSelection={true}
          options={indexPatterns.map(({ id, title }) => ({ value: id, text: title }))}
          value={activeDashboardId}
          onChange={e => onDashboardSelect(e.target.value)}
        />
      </EuiFormRow>
      {!!onCarryFiltersAndQueryToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentFilters"
            label="Carry over filters and query"
            checked={!!carryFiltersAndQuery}
            onChange={onCarryFiltersAndQueryToggle}
          />
        </EuiFormRow>
      )}
      {!!onCarryTimeRangeToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentDateRange"
            label="Carry over time range"
            checked={!!carryTimeRange}
            onChange={onCarryTimeRangeToggle}
          />
        </EuiFormRow>
      )}
    </>
  );
};
