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

import React, { FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToken,
  EuiTitle,
  EuiText,
  EuiIcon,
  IconType,
} from '@elastic/eui';

interface Props {
  title: string;
  subtitle: string;
  iconType: IconType;
}

export const SolutionTitle: FC<Props> = ({ title, subtitle, iconType }) => (
  <EuiFlexGroup gutterSize="none" alignItems="center">
    <EuiFlexItem className="eui-textCenter">
      <EuiToken
        iconType={iconType}
        shape="circle"
        fill="light"
        size="l"
        className="homSolutionPanel__icon"
      />

      <EuiTitle className="eui-textInheritColor" size="s">
        <h3>{title}</h3>
      </EuiTitle>

      <EuiText size="s">
        <p className="homSolutionPanel__subtitle">
          {subtitle} <EuiIcon type="sortRight" />
        </p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
