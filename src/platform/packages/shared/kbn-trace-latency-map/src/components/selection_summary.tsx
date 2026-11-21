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
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LatencyMapSelection, LatencyMapUnit } from '../types';
import { formatDuration, formatTimestamp } from '../geometry/ticks';
import { getCountText, getFailedText } from './unit_text';

/**
 * The selection's bounds and counts as plain text, on the header's left next to the range
 * statistics, with the host's own actions beside it. Clearing lives with the menus on the
 * right.
 */
export function SelectionSummary({
  selection,
  spans,
  failed,
  failedOnly,
  unit,
  sampled,
  timeZone,
  actions,
}: {
  selection: LatencyMapSelection;
  /** Spans the selection holds; absent while the map has no counts (its query failed). */
  spans?: number;
  failed?: number;
  /** The selection is about failed spans, by its own condition or by the host's filter. */
  failedOnly: boolean;
  unit: LatencyMapUnit;
  sampled: boolean;
  timeZone?: string;
  actions?: ReactNode;
}) {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="traceLatencyMapSelectionBar"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="traceLatencyMapSelectionSummary">
          {selection.label && (
            <>
              <strong>{selection.label}</strong>
              {' · '}
            </>
          )}
          {formatDuration(selection.minDuration)} – {formatDuration(selection.maxDuration)}
          {' · '}
          {formatTimestamp(Date.parse(selection.from), timeZone)} –{' '}
          {formatTimestamp(Date.parse(selection.to), timeZone)}
          {spans !== undefined && ` · ${getCountText(unit, spans, sampled)}`}
          {spans !== undefined && failed !== undefined && failed > 0 && (
            <>
              {' · '}
              {getFailedText(failed, spans)}
            </>
          )}
          {failedOnly &&
            ` · ${i18n.translate('traceLatencyMap.selection.failedOnly', {
              defaultMessage: 'failed only',
            })}`}
        </EuiText>
      </EuiFlexItem>
      {actions && <EuiFlexItem grow={false}>{actions}</EuiFlexItem>}
    </EuiFlexGroup>
  );
}
