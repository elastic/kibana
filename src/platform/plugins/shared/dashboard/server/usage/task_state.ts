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
        controls: {
          total: state.telemetry?.controls?.total || 0,
          chaining_system: state.telemetry?.controls?.chaining_system || {},
          label_position: state.telemetry?.controls?.label_position || {},
          ignore_settings: state.telemetry?.controls?.ignore_settings || {},
          by_type: state.telemetry?.controls?.by_type || {},
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
        controls: schema.object({
          total: schema.number(),
          chaining_system: schema.recordOf(schema.string(), schema.number()),
          label_position: schema.recordOf(schema.string(), schema.number()),
          ignore_settings: schema.recordOf(schema.string(), schema.number()),
          by_type: schema.recordOf(
            schema.string(),
            schema.object({
              total: schema.number(),
              details: schema.recordOf(schema.string(), schema.number()),
            })
          ),
        }),
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
    controls: {
      total: 0,
      chaining_system: {},
      ignore_settings: {},
      label_position: {},
      by_type: {},
    },
  },
};
