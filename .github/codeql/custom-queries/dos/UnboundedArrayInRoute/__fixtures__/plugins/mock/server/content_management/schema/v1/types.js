/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Test: Content-management layer schemas should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const cmAttributesSchema = schema.object({
  references: schema.arrayOf(
    schema.object({
      name: schema.string(),
      type: schema.string(),
      id: schema.string(),
    })
  ),
});
