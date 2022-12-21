/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { TELEMETRY_SAVED_OBJECT_TYPE, TELEMETRY_SAVED_OBJECT_ID } from './constants';
export { getTelemetrySavedObject } from './get_telemetry_saved_object';
export { registerTelemetrySavedObject } from './register_telemetry_saved_object';
export { updateTelemetrySavedObject } from './update_telemetry_saved_object';
export type { TelemetrySavedObject, TelemetrySavedObjectAttributes } from './types';
