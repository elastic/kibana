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
import { formatDurationUs, formatTimestamp } from '../geometry/ticks';
import { getCountText, getFailedText } from './unit_text';

export interface CellDetailsProps {
  fromMs: number;
  toMs: number;
  minDurationUs: number;
  maxDurationUs: number;
  spans: number;
  failed: number;
  unit: LatencyMapUnit;
  /** Counts are estimates from a sample. */
  sampled: boolean;
  timeZone?: string;
}

/** The time window, duration range and counts of one cell: the tooltip, and the keyboard's readout. */
export function CellDetails({
  fromMs,
  toMs,
  minDurationUs,
  maxDurationUs,
  spans,
  failed,
  unit,
  sampled,
  timeZone,
}: CellDetailsProps) {
  return (
    <EuiText size="xs" data-test-subj="traceLatencyMapCellDetails">
      <div>
        <strong>
          {formatDurationUs(minDurationUs)} – {formatDurationUs(maxDurationUs)}
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
    </EuiText>
  );
}
