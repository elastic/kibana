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

import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiSwitch,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const Header = ({
  isIncludingSystemIndices,
  onChangeIncludingSystemIndices,
}) => (
  <div>
    <EuiSpacer size="m"/>
    <EuiTitle>
      <h1>
        <FormattedMessage
          id="kbn.management.createIndexPatternHeader"
          defaultMessage="Create index pattern"
        />
      </h1>
    </EuiTitle>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="kbn.management.createIndexPatternLabel"
                defaultMessage="Kibana uses index patterns to retrieve data from Elasticsearch indices for things like visualizations."
              />
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={<FormattedMessage
            id="kbn.management.createIndexPattern.includeSystemIndicesToggleSwitchLabel"
            defaultMessage="Include system indices"
          />}
          id="checkboxShowSystemIndices"
          checked={isIncludingSystemIndices}
          onChange={onChangeIncludingSystemIndices}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m"/>
  </div>
);
