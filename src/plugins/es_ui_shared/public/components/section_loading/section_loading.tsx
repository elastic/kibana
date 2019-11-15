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
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
} from '@elastic/eui';

interface Props {
  inline?: boolean;
  children: React.ReactNode;
  [key: string]: any;
}

export const SectionLoading: React.FunctionComponent<Props> = ({ inline, children, ...rest }) => {
  if (inline) {
    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText {...rest}>
            <EuiTextColor color="subdued">{children}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiEmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={<EuiText color="subdued">{children}</EuiText>}
      data-test-subj="sectionLoading"
    />
  );
};
