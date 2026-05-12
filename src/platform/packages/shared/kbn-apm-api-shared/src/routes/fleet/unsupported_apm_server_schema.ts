/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { defineRoute } from '../types';

export type UnsupportedApmServerSchema = Array<{ key: string; value: unknown }>;

export interface UnsupportedApmServerSchemaResponse {
  unsupported: UnsupportedApmServerSchema;
}

export const unsupportedApmServerSchemaRoute = defineRoute<UnsupportedApmServerSchemaResponse>()({
  endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
});
