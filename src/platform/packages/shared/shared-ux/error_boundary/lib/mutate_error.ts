/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REACT_FATAL_ERROR_EVENT_TYPE } from './telemetry_events';

export function mutateError(error: Error) {
  const customError: Error & { react_error_type?: string } = error;
  customError.react_error_type = REACT_FATAL_ERROR_EVENT_TYPE;
  return customError;
}
