/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';

import { textToTimeRange } from '../parse';
import type { TimeRange, TimeRangeTransformOptions } from '../types';

interface Resolution {
  text: string;
  transformOptions: TimeRangeTransformOptions;
  resolveKey: string;
  timeRange: TimeRange;
}

const resolve = (
  text: string,
  transformOptions: TimeRangeTransformOptions,
  resolveKey: string
): Resolution => ({
  text,
  transformOptions,
  resolveKey,
  timeRange: textToTimeRange(text, transformOptions),
});

/**
 * Parses `text` into a `TimeRange`, re-resolving it whenever `text`, `transformOptions` or
 * `resolveKey` change.
 *
 * Relative bounds (e.g. `now-15m`) resolve against the clock, so a range parsed from unchanged
 * text goes stale over time. `resolveKey` lets the caller force a re-resolution (e.g. after a
 * refresh) without `useMemo`, which cannot depend on a value its factory does not read. The last
 * resolution is kept in state and replaced during render when any input changed.
 */
export function useResolvedTimeRange(
  text: string,
  transformOptions: TimeRangeTransformOptions,
  resolveKey: string
): TimeRange {
  const [resolution, setResolution] = useState(() => resolve(text, transformOptions, resolveKey));

  if (
    resolution.text !== text ||
    resolution.transformOptions !== transformOptions ||
    resolution.resolveKey !== resolveKey
  ) {
    const nextResolution = resolve(text, transformOptions, resolveKey);
    setResolution(nextResolution);
    return nextResolution.timeRange;
  }

  return resolution.timeRange;
}
