/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DurationStats } from '../types';
import { formatDuration } from '../geometry/ticks';

export type SlowestPercentile = 90 | 95 | 99;
export const SLOWEST_PERCENTILES: SlowestPercentile[] = [90, 95, 99];

const percentileDuration = (stats: DurationStats, percentile: SlowestPercentile) =>
  percentile === 99 ? stats.p99 : percentile === 95 ? stats.p95 : stats.p90;

/** The range's statistics, the failed-only switch, the slowest shortcuts and the sampling note. */
export function MapHeader({
  stats,
  failedOnly,
  onFailedOnlyChange,
  onSelectSlowest,
  sampled,
  isDisabled,
}: {
  stats?: DurationStats;
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  onSelectSlowest: (percentile: SlowestPercentile) => void;
  sampled: boolean;
  isDisabled: boolean;
}) {
  const [isSlowestOpen, setIsSlowestOpen] = useState(false);
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="traceLatencyMapHeader"
    >
      <EuiFlexItem grow>
        {stats && (
          <EuiText size="xs" color="subdued" data-test-subj="traceLatencyMapStats">
            {i18n.translate('traceLatencyMap.header.maxStat', {
              defaultMessage: '{max} max',
              values: { max: formatDuration(stats.max) },
            })}
            {' · '}
            <strong>
              {i18n.translate('traceLatencyMap.header.p99Stat', {
                defaultMessage: '{p99} p99',
                values: { p99: formatDuration(stats.p99) },
              })}
            </strong>
          </EuiText>
        )}
      </EuiFlexItem>
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
      <EuiPopover
        button={
          <EuiButtonEmpty
            size="s"
            iconType="sortDown"
            isDisabled={isDisabled || !stats}
            onClick={() => setIsSlowestOpen((open) => !open)}
            data-test-subj="traceLatencyMapSelectSlowest"
          >
            {i18n.translate('traceLatencyMap.header.selectSlowest', {
              defaultMessage: 'Select slowest',
            })}
          </EuiButtonEmpty>
        }
        aria-label={i18n.translate('traceLatencyMap.header.selectSlowestAriaLabel', {
          defaultMessage: 'Select the slowest spans, from a percentile up',
        })}
        isOpen={isSlowestOpen}
        closePopover={() => setIsSlowestOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={SLOWEST_PERCENTILES.map((percentile) => (
            <EuiContextMenuItem
              key={percentile}
              onClick={() => {
                setIsSlowestOpen(false);
                onSelectSlowest(percentile);
              }}
              data-test-subj={`traceLatencyMapSlowest${percentile}`}
            >
              {i18n.translate('traceLatencyMap.header.abovePercentile', {
                defaultMessage: 'Above p{percentile} ({duration})',
                values: {
                  percentile,
                  duration: stats ? formatDuration(percentileDuration(stats, percentile)) : '',
                },
              })}
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
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
