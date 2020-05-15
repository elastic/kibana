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
import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiText,
  EuiSelect,
  EuiIconTip,
} from '@elastic/eui';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export interface TimechartHeaderProps {
  /**
   * the query from date string
   */
  from: string;
  /**
   * the query to date string
   */
  to: string;
  /**
   * Interval Options
   */
  options: Array<{ display: string; val: string }>;
  /**
   * changes the interval
   */
  onChangeInterval: (interval: string) => void;
  /**
   * selected interval
   */
  stateInterval: string;
  /**
   * displays the scaled info of the interval
   */
  showScaledInfo: boolean | undefined;
  /**
   * scaled info description
   */
  bucketIntervalDescription: string;
  /**
   * bucket interval scale
   */
  bucketIntervalScale: number | undefined;
}

export function TimechartHeader({
  from,
  to,
  options,
  onChangeInterval,
  stateInterval,
  showScaledInfo,
  bucketIntervalDescription,
  bucketIntervalScale,
}: TimechartHeaderProps) {
  const [interval, setInterval] = useState(stateInterval);

  useEffect(() => {
    setInterval(stateInterval);
  }, [stateInterval]);

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setInterval(e.target.value);
    onChangeInterval(e.target.value);
  };

  return (
    <I18nProvider>
      <EuiFlexGroup gutterSize="xs" responsive justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('discover.howToChangeTheTimeTooltip', {
              defaultMessage: 'To change the time, click the calendar icon in the navigation bar',
            })}
          >
            <EuiText data-test-subj="discoverIntervalDateRange" size="s">
              {`${from} - ${to} `}&mdash;
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            id="dscResultsIntervalSelector"
            data-test-subj="discoverIntervalSelect"
            options={options
              .filter(({ val }) => val !== 'custom')
              .map(({ display, val }) => {
                return {
                  text: display,
                  value: val,
                  label: display,
                };
              })}
            value={interval}
            onChange={handleIntervalChange}
          />
        </EuiFlexItem>
        {showScaledInfo && (
          <>
            <EuiIconTip
              content={i18n.translate('discover.bucketIntervalTooltip', {
                defaultMessage:
                  'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}',
                values: {
                  bucketsDescription:
                    bucketIntervalScale && bucketIntervalScale > 1
                      ? i18n.translate('discover.bucketIntervalTooltip.tooLargeBucketsText', {
                          defaultMessage: 'buckets that are too large',
                        })
                      : i18n.translate('discover.bucketIntervalTooltip.tooManyBucketsText', {
                          defaultMessage: 'too many buckets',
                        }),
                  bucketIntervalDescription,
                },
              })}
              color="warning"
              size="s"
              type="alert"
            />
            <EuiFlexItem grow={false}>
              <EuiText size="s" data-test-subj="discoverIntervalSelectScaledToDesc">
                <FormattedMessage
                  id="discover.scaledToDescription"
                  defaultMessage="Scaled to {bucketIntervalDescription}"
                  values={{
                    bucketIntervalDescription,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </I18nProvider>
  );
}
