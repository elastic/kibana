/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TypeOf } from '@kbn/config-schema';
import type { versionSchema } from './schema';

type VersionSchema = TypeOf<typeof versionSchema>;

export const upMigration = (state: Record<string, any>): VersionSchema => ({
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
    sections: {
      total: state.telemetry?.sections?.total || 0,
    },
  },
});
