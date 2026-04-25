/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { versionSchema as v2VersionSchema } from '../v2/schema';

export const versionSchema = v2VersionSchema.extends({
  telemetry: v2VersionSchema.getPropSchemas().telemetry.extends({
    controls: v2VersionSchema.getPropSchemas().telemetry.getPropSchemas().controls.extends({
      chaining_system: null,
      label_position: null,
      ignore_settings: null,
    }),
  }),
});
