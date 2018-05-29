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

import React, { Fragment } from 'react';

import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButton,
} from '@elastic/eui';

export const Header = ({
  onExportAll,
  onImport,
  onRefresh,
  totalCount,
}) => (
  <Fragment>
    <EuiSpacer size="m"/>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h1>Edit Saved Objects (Found {totalCount})</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="exportAction"
              data-test-subj="exportAllObjects"
              onClick={onExportAll}
            >
              Export Everything
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="importAction"
              data-test-subj="importObjects"
              onClick={onImport}
            >
              Import
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="refresh"
              onClick={onRefresh}
            >
              Refresh
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s"/>
    <EuiText>
      <p>
        <EuiTextColor color="subdued">
          From here you can delete saved objects, such as saved searches.
          You can also edit the raw data of saved objects.
          Typically objects are only modified via their associated application,
          which is probably what you should use instead of this screen.
        </EuiTextColor>
      </p>
    </EuiText>
    <EuiSpacer size="m"/>
  </Fragment>
);
