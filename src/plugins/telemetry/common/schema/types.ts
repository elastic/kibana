/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AllowedSchemaTypes } from 'src/plugins/usage_collection/server';

/**
 * Type that defines all the possible values that the Telemetry Schema accepts.
 * These types definitions are helping to identify earlier the possible missing `properties` nesting when
 * manually defining the schemas.
 */
export type TelemetrySchemaValue =
  | {
      type: AllowedSchemaTypes | 'pass_through';
      _meta: {
        description: string; // Intentionally enforcing the descriptions here
        optional?: boolean;
      };
    }
  | TelemetrySchemaArray
  | TelemetrySchemaObject;

export interface TelemetryMeta {
  _meta?: {
    description?: string;
    optional?: boolean;
  };
}

export interface TelemetrySchemaArray extends TelemetryMeta {
  type: 'array';
  items: TelemetrySchemaValue;
}

export interface TelemetrySchemaObject extends TelemetryMeta {
  properties: {
    [key: string]: TelemetrySchemaValue;
  };
}

export type TelemetryRootSchema = TelemetrySchemaObject['properties'];
