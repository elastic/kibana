/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
export const stateSchemaByVersion = {
  1: {
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, any>) => ({
      runs: typeof state.runs === 'number' ? state.runs : 0,
      telemetry: {
        panels: {
          total: state.telemetry?.panels?.total || 0,
          by_reference: state.telemetry?.panels?.by_reference || 0,
          by_value: state.telemetry?.panels?.by_value || 0,
          by_type: state.telemetry?.panels?.by_type || {},
        },
      },
    }),
    schema: schema.object({
      runs: schema.number(),
      telemetry: schema.object({
        panels: schema.object({
          total: schema.number(),
          by_reference: schema.number(),
          by_value: schema.number(),
          by_type: schema.recordOf(
            schema.string(),
            schema.object({
              total: schema.number(),
              by_reference: schema.number(),
              by_value: schema.number(),
              details: schema.recordOf(schema.string(), schema.number()),
            })
          ),
        }),
        sections: schema.object({ total: schema.number() }),
      }),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  runs: 0,
  telemetry: {
    panels: {
      total: 0,
      by_reference: 0,
      by_value: 0,
      by_type: {},
    },
    sections: {
      total: 0,
    },
  },
};
