/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@elastic/datemath';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { ChangePointCardModel } from './derive_change_point_cards';

// Resolves any time range bound (absolute ISO or relative expression) to epoch milliseconds.
// Returns undefined if the string cannot be parsed (e.g. "$timeFrom").
// roundUp=true is the Kibana convention for "to" bounds (e.g. "now/d" → end of day).
const toAbsoluteMs = (s: string, roundUp = false): number | undefined => {
  const parsed = dateMath.parse(s, { roundUp });
  return parsed?.isValid() ? parsed.valueOf() : undefined;
};

/**
 * Builds a focused time range centred on all of the card's change-point annotations.
 *
 * Both absolute ISO and relative bounds (e.g. "now-30d") are resolved to milliseconds
 * via datemath before computing the focused window. The window spans from
 * (earliest annotation − 3% of total range) to (latest annotation + 3% of total range),
 * clamped to the original bounds.
 * Returns undefined if the time range cannot be resolved.
 */
export const buildFocusedViewTimeRange = (
  annotationEvents: ChangePointCardModel['annotationEvents'],
  chartTimeRange: TimeRange
): TimeRange | undefined => {
  const timestamps = annotationEvents.map((e) => new Date(e.datetime).getTime());
  const earliestMs = Math.min(...timestamps);
  const latestMs = Math.max(...timestamps);

  const fromMs = toAbsoluteMs(chartTimeRange.from);
  const toMs = toAbsoluteMs(chartTimeRange.to, true);

  if (fromMs !== undefined && toMs !== undefined) {
    const padding = (toMs - fromMs) * 0.03;
    return {
      from: new Date(Math.max(fromMs, earliestMs - padding)).toISOString(),
      to: new Date(Math.min(toMs, latestMs + padding)).toISOString(),
    };
  }
};
