/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface PercentileHdrProps {
  value: number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
