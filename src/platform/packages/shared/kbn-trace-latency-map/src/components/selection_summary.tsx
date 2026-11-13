/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LatencyMapSelection, LatencyMapUnit } from '../types';
import { formatDuration, formatTimestamp } from '../geometry/ticks';
import { getCountText, getFailedText } from './unit_text';

/**
 * The selection in the header's top-right cluster, as in the prototype: a compact badge with
 * the bounds and count (times and failures in its tooltip), the host's own actions, and a way
 * to clear it.
 */
export function SelectionSummary({
  selection,
  spans,
  failed,
  failedOnly,
  unit,
  sampled,
  timeZone,
  onClear,
  actions,
}: {
  selection: LatencyMapSelection;
  spans: number;
  failed: number;
  /** The selection is about failed spans, by its own condition or by the host's filter. */
  failedOnly: boolean;
  unit: LatencyMapUnit;
  sampled: boolean;
  timeZone?: string;
  onClear: () => void;
  actions?: ReactNode;
}) {
  const detail = (
    <>
      {formatTimestamp(Date.parse(selection.from), timeZone)} –{' '}
      {formatTimestamp(Date.parse(selection.to), timeZone)}
      {failed > 0 && (
        <>
          <br />
          {getFailedText(failed, spans)}
        </>
      )}
    </>
  );
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="traceLatencyMapSelectionBar"
    >
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="cross"
          onClick={onClear}
          aria-label={i18n.translate('traceLatencyMap.selection.clearAriaLabel', {
            defaultMessage: 'Clear selection',
          })}
          data-test-subj="traceLatencyMapClearSelection"
        >
          {i18n.translate('traceLatencyMap.selection.clear', { defaultMessage: 'Clear' })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={detail}>
          <EuiBadge
            color="hollow"
            iconType="crosshair"
            tabIndex={0}
            data-test-subj="traceLatencyMapSelectionSummary"
          >
            {selection.label && `${selection.label} · `}
            {formatDuration(selection.minDuration)} – {formatDuration(selection.maxDuration)}
            {' · '}
            {getCountText(unit, spans, sampled)}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
      {failedOnly && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger" data-test-subj="traceLatencyMapFailedOnlyBadge">
            {i18n.translate('traceLatencyMap.selection.failedOnlyBadge', {
              defaultMessage: 'Failed only',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {actions && <EuiFlexItem grow={false}>{actions}</EuiFlexItem>}
    </EuiFlexGroup>
  );
}
