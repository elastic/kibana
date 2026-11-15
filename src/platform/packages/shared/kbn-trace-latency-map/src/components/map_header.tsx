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
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DurationStats } from '../types';
import type { MapSampling } from '../query/latency_map_query';
import { formatDuration } from '../geometry/ticks';
import { ErrorsMenu } from './errors_menu';

export type SlowestPercentile = 90 | 95 | 99;
export const SLOWEST_PERCENTILES: SlowestPercentile[] = [90, 95, 99];

const percentileDuration = (stats: DurationStats, percentile: SlowestPercentile) =>
  percentile === 99 ? stats.p99 : percentile === 95 ? stats.p95 : stats.p90;

const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`;

/** Says what a sampled map draws exactly and what it estimates. */
function SamplingNote({ stats, sampling }: { stats: DurationStats; sampling: MapSampling }) {
  return (
    <EuiToolTip
      content={i18n.translate('traceLatencyMap.header.samplingTooltip', {
        defaultMessage:
          '{spans} spans in this range. Failed spans and spans from {tail} on are all drawn. The others are drawn from a {percent} sample, with counts scaled up.',
        values: {
          spans: stats.spans.toLocaleString(),
          tail: formatDuration(sampling.tail),
          percent: formatShare(sampling.probability),
        },
      })}
    >
      <EuiText size="xs" color="subdued" tabIndex={0} data-test-subj="traceLatencyMapSamplingNote">
        {i18n.translate('traceLatencyMap.header.sampled', { defaultMessage: 'Sampled' })}
      </EuiText>
    </EuiToolTip>
  );
}

/** The range's statistics, the sampling note, the slowest shortcuts and the errors menu. */
export function MapHeader({
  stats,
  failedOnly,
  onFailedOnlyChange,
  onSelectSlowest,
  sampling,
  isDisabled,
}: {
  stats?: DurationStats;
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  onSelectSlowest: (percentile: SlowestPercentile) => void;
  /** How a large range is sampled; undefined when every span is read. */
  sampling?: MapSampling;
  isDisabled: boolean;
}) {
  const [isSlowestOpen, setIsSlowestOpen] = useState(false);
  return (
    <EuiFlexGroup
      gutterSize="s"
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
      {stats && sampling && (
        <EuiFlexItem grow={false}>
          <SamplingNote stats={stats} sampling={sampling} />
        </EuiFlexItem>
      )}
      <EuiPopover
        button={
          <EuiButtonEmpty
            size="xs"
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
      <ErrorsMenu
        failedOnly={failedOnly}
        onFailedOnlyChange={onFailedOnlyChange}
        isDisabled={isDisabled}
      />
    </EuiFlexGroup>
  );
}
