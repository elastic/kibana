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
import { EuiFormRow, EuiSelect, EuiSwitch, EuiSpacer } from '@elastic/eui';
import { txtChooseDestinationIndexPattern } from './i18n';

export interface IndexPatternItem {
  id: string;
  title: string;
}

export interface DiscoverDrilldownConfigProps {
  activeIndexPatternId?: string;
  indexPatterns: IndexPatternItem[];
  onIndexPatternSelect: (indexPatternId: string) => void;
  customIndexPattern?: boolean;
  onCustomIndexPatternToggle?: () => void;
  carryFiltersAndQuery?: boolean;
  onCarryFiltersAndQueryToggle?: () => void;
  carryTimeRange?: boolean;
  onCarryTimeRangeToggle?: () => void;
}

export const DiscoverDrilldownConfig: React.FC<DiscoverDrilldownConfigProps> = ({
  activeIndexPatternId,
  indexPatterns,
  onIndexPatternSelect,
  customIndexPattern,
  onCustomIndexPatternToggle,
  carryFiltersAndQuery,
  onCarryFiltersAndQueryToggle,
  carryTimeRange,
  onCarryTimeRangeToggle,
}) => {
  return (
    <>
      {!!onCustomIndexPatternToggle && (
        <>
          <EuiFormRow hasChildLabel={false}>
            <EuiSwitch
              name="customIndexPattern"
              label="Use custom index pattern"
              checked={!!customIndexPattern}
              onChange={onCustomIndexPatternToggle}
            />
          </EuiFormRow>
          {!!customIndexPattern && (
            <EuiFormRow label={txtChooseDestinationIndexPattern}>
              <EuiSelect
                name="selectDashboard"
                hasNoInitialSelection={true}
                options={indexPatterns.map(({ id, title }) => ({ value: id, text: title }))}
                value={activeIndexPatternId}
                onChange={e => onIndexPatternSelect(e.target.value)}
              />
            </EuiFormRow>
          )}
          <EuiSpacer size="xl" />
        </>
      )}

      {!!onCarryFiltersAndQueryToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="carryFiltersAndQuery"
            label="Carry over filters and query"
            checked={!!carryFiltersAndQuery}
            onChange={onCarryFiltersAndQueryToggle}
          />
        </EuiFormRow>
      )}
      {!!onCarryTimeRangeToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="carryTimeRange"
            label="Carry over time range"
            checked={!!carryTimeRange}
            onChange={onCarryTimeRangeToggle}
          />
        </EuiFormRow>
      )}
    </>
  );
};
