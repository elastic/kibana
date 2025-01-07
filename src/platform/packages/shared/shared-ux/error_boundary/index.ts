/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { KibanaErrorBoundaryProvider } from './src/services/error_boundary_services';
export { KibanaErrorBoundary } from './src/ui/error_boundary';
export { ThrowIfError } from './src/ui/throw_if_error';

export { REACT_FATAL_ERROR_EVENT_TYPE, reactFatalErrorSchema } from './lib/telemetry_events';
export type { ReactFatalError } from './lib/telemetry_events';
