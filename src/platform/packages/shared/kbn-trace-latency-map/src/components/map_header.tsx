/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type SlowestPercentile = 95 | 99;

/** Failed-only switch, shortcuts to the slowest spans, and the note of a sampled map. */
export function MapHeader({
  failedOnly,
  onFailedOnlyChange,
  onSelectSlowest,
  sampled,
  isDisabled,
}: {
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  onSelectSlowest: (percentile: SlowestPercentile) => void;
  sampled: boolean;
  isDisabled: boolean;
}) {
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="traceLatencyMapHeader"
    >
      <EuiSwitch
        compressed
        label={i18n.translate('traceLatencyMap.header.failedOnly', {
          defaultMessage: 'Failed only',
        })}
        checked={failedOnly}
        onChange={(event) => onFailedOnlyChange(event.target.checked)}
        disabled={isDisabled}
        data-test-subj="traceLatencyMapFailedOnly"
      />
      {([95, 99] as const).map((percentile) => (
        <EuiButtonEmpty
          key={percentile}
          size="xs"
          iconType="chevronSingleUp"
          isDisabled={isDisabled}
          onClick={() => onSelectSlowest(percentile)}
          data-test-subj={`traceLatencyMapSlowest${percentile}`}
        >
          {i18n.translate('traceLatencyMap.header.slowest', {
            defaultMessage: 'Slowest {percent}%',
            values: { percent: 100 - percentile },
          })}
        </EuiButtonEmpty>
      ))}
      {sampled && (
        <EuiText size="xs" color="subdued" data-test-subj="traceLatencyMapSamplingNote">
          {i18n.translate('traceLatencyMap.header.sampled', {
            defaultMessage:
              'Large range: failed and slowest spans are exact, the rest is estimated from a sample.',
          })}
        </EuiText>
      )}
    </EuiFlexGroup>
  );
}
