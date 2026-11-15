/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { LatencyMapUnit } from '../types';
import { formatDuration, formatTimestamp } from '../geometry/ticks';
import { getCountText, getFailedText } from './unit_text';

export interface CellDetailsProps {
  fromMs: number;
  toMs: number;
  minDuration: number;
  maxDuration: number;
  spans: number;
  failed: number;
  unit: LatencyMapUnit;
  /** Counts are estimates from a sample. */
  sampled: boolean;
  /** A line hinting at what the pointer can do, in the tooltip only. */
  hint?: string;
  timeZone?: string;
}

/** The time window, duration range and counts of one cell: the tooltip, and the keyboard's readout. */
export function CellDetails({
  fromMs,
  toMs,
  minDuration,
  maxDuration,
  spans,
  failed,
  unit,
  sampled,
  hint,
  timeZone,
}: CellDetailsProps) {
  return (
    <EuiText size="xs" data-test-subj="traceLatencyMapCellDetails">
      <div>
        <strong>
          {formatDuration(minDuration)} – {formatDuration(maxDuration)}
        </strong>
        {' · '}
        {getCountText(unit, spans, sampled)}
      </div>
      {failed > 0 && (
        <EuiText size="xs" color="danger">
          {getFailedText(failed, spans)}
        </EuiText>
      )}
      <EuiText size="xs" color="subdued">
        {formatTimestamp(fromMs, timeZone)} – {formatTimestamp(toMs, timeZone)}
      </EuiText>
      {hint && (
        <EuiText size="xs" color="subdued">
          {hint}
        </EuiText>
      )}
    </EuiText>
  );
}
