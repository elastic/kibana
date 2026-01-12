/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { versionSchema as v1VersionSchema } from '../v1/schema';

export const versionSchema = v1VersionSchema.extends({
  telemetry: v1VersionSchema.getPropSchemas().telemetry.extends({
    access_mode: schema.recordOf(schema.string(), schema.object({ total: schema.number() })),
  }),
});
