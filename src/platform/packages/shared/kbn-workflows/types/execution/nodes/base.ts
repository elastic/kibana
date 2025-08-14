/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const ExecutionGraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  configuration: z.any(),
});

export type ExecutionGraphNode = z.infer<typeof ExecutionGraphNodeSchema>;

export const AtomicGraphNodeSchema = z.object({
  id: z.string(),
  type: z.literal('atomic'),
  configuration: z.any(),
});
export type AtomicGraphNode = z.infer<typeof AtomicGraphNodeSchema>;
