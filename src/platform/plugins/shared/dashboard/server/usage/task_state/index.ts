/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { versionDefinition as v1 } from './v1';
import { versionDefinition as v2 } from './v2';

export const stateSchemaByVersion = {
  1: v1,
  2: v2,
};

const latest = v2;
/**
 * WARNING: Do not modify the code below when doing a new version.
 * Update the "latest\" variable instead.
 */
const latestTaskStateSchema = latest.schema;
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
    sections: {
      total: 0,
    },
    access_mode: {},
  },
};
