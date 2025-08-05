/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TimeShift utils
 */
export function fromTimeShiftAPIToLensState(timeShift: string | undefined): string | undefined {
  if (!timeShift) {
    return;
  }
}

export function fromTimeShiftLensStateToAPI(timeShift: string | undefined): string | undefined {
  if (!timeShift) {
    return;
  }
}

/**
 * Reduced time range utils
 */
export function fromReducedTimeRangeAPIToLensState(
  reducedTimeRange: string | undefined
): string | undefined {
  if (!reducedTimeRange) {
    return;
  }
}
export function fromReducedTimeRangeLensStateToAPI(
  reducedTimeRange: string | undefined
): string | undefined {
  if (!reducedTimeRange) {
    return;
  }
}

/**
 * Time range utils
 */
export function fromTimeRangeAPIToLensState(timeRange: string | undefined): string | undefined {
  if (!timeRange) {
    return;
  }
}
export function fromTimeRangeLensStateToAPI(timeRange: string | undefined): string | undefined {
  if (!timeRange) {
    return;
  }
}
