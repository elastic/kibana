/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { JSONSchema } from '@kbn/zod/v4/core';

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType): JSONSchema.JSONSchema | null {
  try {
    return z.toJSONSchema(yamlSchema, {
      target: 'draft-7',
    });
  } catch (error) {
    // console.error('Error generating JSON schema from YAML schema:', error);
    return null;
  }
}
