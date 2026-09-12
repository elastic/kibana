/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Test: Dashboard saved-object schemas should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const dashboardAttributesSchema = schema.object({
  panels: schema.arrayOf(
    schema.object({
      id: schema.string(),
      type: schema.string(),
    })
  ),
});
