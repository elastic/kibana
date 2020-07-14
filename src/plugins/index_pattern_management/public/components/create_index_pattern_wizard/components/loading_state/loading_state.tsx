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

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const LoadingState = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center" direction="column" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <h2 style={{ textAlign: 'center' }}>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.loadingState.checkingLabel"
            defaultMessage="Checking for Elasticsearch data"
          />
        </h2>
      </EuiTitle>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
