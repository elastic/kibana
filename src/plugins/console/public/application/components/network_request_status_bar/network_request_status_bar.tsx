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

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, EuiCode, EuiToolTip } from '@elastic/eui';

export interface Props {
  statusCode: number;
  statusText: string;
  method: string;
  endpoint: string;
  timeElapsedMs: number;
}

const mapStatusCodeToBadgeColor = (statusCode: number) => {
  if (statusCode <= 199) {
    return 'default';
  }

  if (statusCode <= 299) {
    return 'secondary';
  }

  if (statusCode <= 399) {
    return 'primary';
  }

  if (statusCode <= 499) {
    return 'warning';
  }

  return 'danger';
};

export const NetworkRequestStatusBar: FunctionComponent<Props> = ({
  endpoint,
  statusCode,
  statusText,
  timeElapsedMs,
  method,
}) => (
  <EuiFlexGroup
    justifyContent="flexEnd"
    alignItems="center"
    direction="row"
    gutterSize="none"
    responsive={false}
  >
    <EuiFlexItem
      grow={false}
      className="conApp__outputNetworkRequestStatusBar__item conApp__outputNetworkRequestStatusBar__badge"
    >
      <EuiToolTip
        position="top"
        content={
          <EuiText size="s">{`${method} ${
            endpoint.startsWith('/') ? endpoint : '/' + endpoint
          }`}</EuiText>
        }
      >
        <EuiBadge
          color={mapStatusCodeToBadgeColor(statusCode)}
        >{`${statusCode} - ${statusText}`}</EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>

    <EuiFlexItem grow={false} className="conApp__outputNetworkRequestStatusBar__item">
      <EuiToolTip position="top" content={<EuiText size="s">{`Time Elapsed`}</EuiText>}>
        <EuiText size="s">
          <EuiCode paddingSize="none">{`${timeElapsedMs} ms`}</EuiCode>
        </EuiText>
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);
