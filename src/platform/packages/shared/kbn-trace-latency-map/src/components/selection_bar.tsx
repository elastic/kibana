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
import { EuiButtonEmpty, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LatencyMapSelection, LatencyMapUnit } from '../types';
import { formatDurationUs, formatTimestamp } from '../geometry/ticks';
import { getCountText, getFailedText } from './unit_text';

/** The bounds and counts of the selection, a way to clear it, and the host's own actions. */
export function SelectionBar({
  selection,
  spans,
  failed,
  unit,
  sampled,
  timeZone,
  onClear,
  actions,
}: {
  selection: LatencyMapSelection;
  spans: number;
  failed: number;
  unit: LatencyMapUnit;
  sampled: boolean;
  timeZone?: string;
  onClear: () => void;
  actions?: ReactNode;
}) {
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="traceLatencyMapSelectionBar"
    >
      <EuiText size="xs" data-test-subj="traceLatencyMapSelectionSummary">
        <strong>
          {formatDurationUs(selection.minDurationUs)} – {formatDurationUs(selection.maxDurationUs)}
        </strong>
        {' · '}
        {formatTimestamp(Date.parse(selection.from), timeZone)} –{' '}
        {formatTimestamp(Date.parse(selection.to), timeZone)}
        {' · '}
        {getCountText(unit, spans, sampled)}
        {failed > 0 && (
          <>
            {' · '}
            {getFailedText(failed, spans)}
          </>
        )}
        {selection.failedOnly &&
          ` · ${i18n.translate('traceLatencyMap.selection.failedOnly', {
            defaultMessage: 'failed only',
          })}`}
      </EuiText>
      {actions}
      <EuiButtonEmpty
        size="xs"
        iconType="cross"
        onClick={onClear}
        data-test-subj="traceLatencyMapClearSelection"
      >
        {i18n.translate('traceLatencyMap.selection.clear', { defaultMessage: 'Clear selection' })}
      </EuiButtonEmpty>
    </EuiFlexGroup>
  );
}
