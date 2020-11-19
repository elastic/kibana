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
import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface PercentileHdrProps {
  value: number | undefined;
  onChange: () => void;
}

export const PercentileHdr = ({ value, onChange }: PercentileHdrProps) => (
  <EuiFormRow
    label={
      <>
        <FormattedMessage
          id="visTypeTimeseries.percentileHdr.numberOfSignificantValueDigits"
          defaultMessage="Number of significant value digits (HDR histogram)"
        />{' '}
        <EuiIconTip
          position="right"
          content={
            <FormattedMessage
              id="visTypeTimeseries.percentileHdr.numberOfSignificantValueDigits.hint"
              defaultMessage="HDR Histogram (High Dynamic Range Histogram) is an alternative implementation that can be useful when calculating percentile ranks for latency measurements as it can be faster than the t-digest implementation with the trade-off of a larger memory footprint. Number of significant value digits parameter specifies the resolution of values for the histogram in number of significant digits"
            />
          }
          type="questionInCircle"
        />
      </>
    }
  >
    <EuiFieldNumber min={1} value={value || ''} onChange={onChange} />
  </EuiFormRow>
);
