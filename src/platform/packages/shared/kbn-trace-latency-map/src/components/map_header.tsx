/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DurationStats } from '../types';
import type { MapSampling } from '../query/latency_map_query';
import type { LatencyMapOperation, OperationBands } from '../operations/operation_bands';
import { formatDuration, formatShare } from '../geometry/ticks';
import { SLOWEST_PERCENTILES, percentileDuration } from '../selection/slowest';
import type { SlowestPercentile } from '../selection/slowest';
import { DurationGroupsPicker } from './duration_groups_picker';

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

/**
 * The errors filter, as the one switch a filter is elsewhere in Discover ("Selected only",
 * "Hide null fields"): plain, and disabled with the reason while the map has no failed span
 * to show. On, it stays enabled, so an empty filtered map is a switch away from the spans.
 */
function ErrorsSwitch({
  failedOnly,
  failedCount,
  onFailedOnlyChange,
  isDisabled,
}: {
  failedOnly: boolean;
  failedCount?: number;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  isDisabled: boolean;
}) {
  const noErrors = failedCount === 0 && !failedOnly;
  const control = (
    <EuiSwitch
      compressed
      label={i18n.translate('traceLatencyMap.errors.switch', {
        defaultMessage: 'Errors only',
      })}
      checked={failedOnly}
      onChange={(event) => onFailedOnlyChange(event.target.checked)}
      // On, it stays usable whatever the map shows: an empty filtered map needs it.
      disabled={failedOnly ? false : isDisabled || noErrors}
      data-test-subj="traceLatencyMapFailedOnly"
    />
  );
  return noErrors ? (
    <EuiToolTip
      content={i18n.translate('traceLatencyMap.errors.noneTooltip', {
        defaultMessage: 'No errors in this result set',
      })}
    >
      {control}
    </EuiToolTip>
  ) : (
    control
  );
}

/** The range's statistics, the sampling note, the slowest shortcuts and the errors switch. */
export function MapHeader({
  stats,
  failedCount,
  failedOnly,
  onFailedOnlyChange,
  onSelectSlowest,
  activeSlowest,
  sampling,
  isDisabled,
  selectionSummary,
  onClearSelection,
  operationsWithGroups,
  onFocusOperation,
  focusedOperation,
  onClearOperation,
}: {
  stats?: DurationStats;
  /** Failed spans of the whole map, once counted: with none the errors switch is disabled. */
  failedCount?: number;
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  onSelectSlowest: (percentile: SlowestPercentile) => void;
  /** The slowest shortcut the selection currently matches, shown on the menu's button. */
  activeSlowest?: SlowestPercentile;
  /** How a large range is sampled; undefined when every span is read. */
  sampling?: MapSampling;
  isDisabled: boolean;
  /** The selection as text, on the left next to the statistics. */
  selectionSummary?: ReactNode;
  /** With a selection, the Clear button at the far right, by the menus. */
  onClearSelection?: () => void;
  /** Operations with distinct duration groups, suggested in a dropdown while none is focused. */
  operationsWithGroups?: OperationBands[];
  onFocusOperation?: (operation: LatencyMapOperation) => void;
  /** The operation the host is narrowed to, shown as a badge with a way back to all. */
  focusedOperation?: LatencyMapOperation;
  onClearOperation?: () => void;
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
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
          {stats && (
            <EuiFlexItem grow={false}>
              {/* The p99 is the figure to read at a glance: full colour and bold, a size up. */}
              <EuiText size="s" color="subdued" data-test-subj="traceLatencyMapStats">
                {i18n.translate('traceLatencyMap.header.maxStat', {
                  defaultMessage: '{max} max',
                  values: { max: formatDuration(stats.max) },
                })}
                {' · '}
                <EuiTextColor color="default">
                  <strong>
                    {i18n.translate('traceLatencyMap.header.p99Stat', {
                      defaultMessage: '{p99} p99',
                      values: { p99: formatDuration(stats.p99) },
                    })}
                  </strong>
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          )}
          {selectionSummary && <EuiFlexItem grow={false}>{selectionSummary}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexItem>
      {stats && sampling && (
        <EuiFlexItem grow={false}>
          <SamplingNote stats={stats} sampling={sampling} />
        </EuiFlexItem>
      )}
      {focusedOperation && onClearOperation && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconSide="right"
            iconOnClick={onClearOperation}
            iconOnClickAriaLabel={i18n.translate('traceLatencyMap.header.showAllOperations', {
              defaultMessage: 'Show all operations',
            })}
            data-test-subj="traceLatencyMapOperationBadge"
          >
            {i18n.translate('traceLatencyMap.header.operationBadge', {
              defaultMessage: 'Operation: {service} {operation}',
              values: { service: focusedOperation.service, operation: focusedOperation.name },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {onFocusOperation && operationsWithGroups?.length ? (
        <EuiFlexItem grow={false}>
          <DurationGroupsPicker
            operations={operationsWithGroups}
            onFocusOperation={onFocusOperation}
          />
        </EuiFlexItem>
      ) : null}
      <EuiPopover
        button={
          <EuiButtonEmpty
            size="xs"
            iconType="chevronSingleDown"
            iconSide="right"
            isDisabled={isDisabled || !stats}
            onClick={() => setIsSlowestOpen((open) => !open)}
            data-test-subj="traceLatencyMapSelectSlowest"
          >
            {activeSlowest
              ? // The active shortcut shows on the button, as the errors switch is checked.
                i18n.translate('traceLatencyMap.header.selectSlowestActive', {
                  defaultMessage: 'Select slowest (p{percentile})',
                  values: { percentile: activeSlowest },
                })
              : i18n.translate('traceLatencyMap.header.selectSlowest', {
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
              icon={activeSlowest === percentile ? 'check' : 'empty'}
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
      <EuiFlexItem grow={false}>
        <ErrorsSwitch
          failedOnly={failedOnly}
          failedCount={failedCount}
          onFailedOnlyChange={onFailedOnlyChange}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      {onClearSelection && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="cross"
            onClick={onClearSelection}
            aria-label={i18n.translate('traceLatencyMap.selection.clearAriaLabel', {
              defaultMessage: 'Clear selection',
            })}
            data-test-subj="traceLatencyMapClearSelection"
          >
            {i18n.translate('traceLatencyMap.selection.clear', { defaultMessage: 'Clear' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
