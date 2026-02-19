/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/** Schema for shape only: each item must have title and condition strings. KQL/schema validation is in validate_kql_conditions.ts (loaded dynamically). */
export const conditionExamplesSchema = z.array(
  z.object({ title: z.string(), condition: z.string() })
);

/** Single condition example (title + KQL condition). Validate conditions via validateKqlConditions in validate_kql_conditions.ts. */
export type ConditionExample = z.infer<typeof conditionExamplesSchema>[number];
