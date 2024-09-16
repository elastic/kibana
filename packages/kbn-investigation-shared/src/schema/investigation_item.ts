/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const itemSchema = z.object({
  title: z.string(),
  type: z.string(),
  params: z.record(z.string(), z.any()),
});

const investigationItemSchema = z.intersection(
  z.object({
    id: z.string(),
    createdAt: z.number(),
    createdBy: z.string(),
  }),
  itemSchema
);

type Item = z.infer<typeof itemSchema>;
type InvestigationItem = z.infer<typeof investigationItemSchema>;

export type { Item, InvestigationItem };
export { investigationItemSchema, itemSchema };
