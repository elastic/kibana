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

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';

export interface Props {
  requestInProgress: boolean;
  requestResult?: {
    // Status code of the request, e.g., 200
    statusCode: number;

    // Status text of the request, e.g., OK
    statusText: string;

    // Method of the request, e.g., GET
    method: string;

    // The path of endpoint that was called, e.g., /_search
    endpoint: string;

    // The time, in milliseconds, that the last request took
    timeElapsedMs: number;
  };
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
  requestInProgress,
  requestResult,
}) => {
  let content: React.ReactNode = null;

  if (requestInProgress) {
    content = (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('console.requestInProgressBadgeText', {
            defaultMessage: 'Request in progress',
          })}
        </EuiBadge>
      </EuiFlexItem>
    );
  } else if (requestResult) {
    const { endpoint, method, statusCode, statusText, timeElapsedMs } = requestResult;

    content = (
      <>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            content={
              <EuiText size="s">{`${method} ${
                endpoint.startsWith('/') ? endpoint : '/' + endpoint
              }`}</EuiText>
            }
          >
            <EuiBadge color={mapStatusCodeToBadgeColor(statusCode)}>
              {/*  Use &nbsp; to ensure that no matter the width we don't allow line breaks */}
              {statusCode}&nbsp;-&nbsp;{statusText}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            content={
              <EuiText size="s">
                {i18n.translate('console.requestTimeElapasedBadgeTooltipContent', {
                  defaultMessage: 'Time Elapsed',
                })}
              </EuiText>
            }
          >
            <EuiText size="s">
              <EuiBadge color="default">
                {timeElapsedMs}&nbsp;{'ms'}
              </EuiBadge>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      </>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="center"
      direction="row"
      gutterSize="s"
      responsive={false}
    >
      {content}
    </EuiFlexGroup>
  );
};
