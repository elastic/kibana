/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { either } from 'fp-ts/lib/Either';
import type { TelemetryRootSchema } from './types';
import { convertSchemaToIoTs } from './schema_to_io_ts';

/**
 * Merges the telemetrySchema, generates a @kbn/config-schema version from it, and uses it to validate stats.
 * @param telemetrySchema The JSON schema definitions for root and plugins
 * @param stats The full output of the telemetry plugin
 */
export function assertTelemetryPayload(telemetrySchema: TelemetryRootSchema, event: unknown): void {
  const validator = convertSchemaToIoTs(telemetrySchema);

  // Run io-ts validation to the event
  const result = validator.decode(event);

  either.mapLeft(result, (validationErrors) => {
    throw new Error(`Failed to validate event: ${JSON.stringify(validationErrors)}`);
  });
}
