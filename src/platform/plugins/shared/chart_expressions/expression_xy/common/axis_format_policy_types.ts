/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Position } from '@elastic/charts';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export interface AxisPolicyMember {
  layerId: string;
  accessor: string;
  /** Multiply source values by this to reach `coordinateUnit`. 1 means no conversion. */
  factor: number;
  format: SerializedFieldFormat;
  kind: 'data' | 'reference';
}

interface AxisFormatMismatch {
  layerId: string;
  accessor: string;
  format: SerializedFieldFormat;
}

/**
 * Runtime format policy for one Y-axis group. Inferred after layers evaluate; not persisted.
 *
 * The first data series on the group owns the axis: `formatter` is used for ticks, tooltips, and
 * reference-line labels. Duration members are converted from their source unit into
 * `coordinateUnit` (`humanize` / `humanizePrecise` → seconds).
 *
 * Example — seconds (humanizePrecise, 1) + milliseconds (humanizePrecise, 1000) on the left axis:
 *
 *     groupId: 'left'
 *     position: 'left'
 *     formatter: duration, inputFormat 'seconds' (rewritten from coordinateUnit), outputFormat 'humanizePrecise'
 *     coordinateUnit: 'seconds'
 *     members:
 *       foo_s  kind data  factor 1      (already seconds)
 *       foo_ms kind data  factor 0.001  (ms → seconds)
 *     mismatches: []  (same output method, nothing overridden for display)
 */
export interface AxisFormatPolicy {
  /** `left`, `right`, or `axis-${id}` for an explicit Y-axis config. */
  groupId: string;
  position: typeof Position.Left | typeof Position.Right;
  /** Formatter used for ticks, tooltips, and reference-line labels. Duration `inputFormat` is rewritten to `coordinateUnit`. */
  formatter: SerializedFieldFormat;
  /** Plotted-number unit for this axis. Absent when the owner is not a valid duration. */
  coordinateUnit?: string;
  members: AxisPolicyMember[];
  /** Members whose display format disagrees with the owner (same output method is not a mismatch). */
  mismatches: AxisFormatMismatch[];
}
