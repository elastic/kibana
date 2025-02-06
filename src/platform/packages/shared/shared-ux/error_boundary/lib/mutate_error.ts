/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REACT_FATAL_ERROR_EVENT_TYPE } from './telemetry_events';

/**
 * Adds a `react_error_type` property to an Error object.
 * The Error is mutated rather than copied, to keep the original prototype so that it can be captured in APM
 * without side effects.
 */
export function mutateError(error: Error) {
  const customError: Error & { react_error_type?: string } = error;
  customError.react_error_type = REACT_FATAL_ERROR_EVENT_TYPE;
  return customError;
}
