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
import PropTypes from 'prop-types';

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiLink,
  EuiButton,
} from '@elastic/eui';

export const EmptyState = ({
  onRefresh,
}) => (
  <EuiPanel paddingSize="l">
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <EuiTextColor color="subdued">
            <h2 style={{ textAlign: 'center' }}>Couldn&apos;t find any Elasticsearch data</h2>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <EuiTextColor color="subdued">
              You&apos;ll need to index some data into Elasticsearch before you can create an index pattern.
            </EuiTextColor>
            &nbsp;
            <EuiLink
              href="#/home/tutorial_directory"
            >
              Learn how
            </EuiLink>
            {' or '}
            <EuiLink
              href="#/home/tutorial_directory/sampleData"
            >
              get started with some sample data sets.
            </EuiLink>
          </p>
        </EuiText>

        <EuiSpacer size="m"/>

        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={onRefresh}
              data-test-subj="refreshIndicesButton"
            >
              Check for new data
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

EmptyState.propTypes = {
  onRefresh: PropTypes.func.isRequired,
};
