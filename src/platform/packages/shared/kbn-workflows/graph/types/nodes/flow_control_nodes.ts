/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { GraphNodeSchema } from './base';

export const LoopBreakNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('loop-break')),
  loopExitNodeId: lazySchema(() => z.string()),
  loopStepId: lazySchema(() => z.string()),
});

export type LoopBreakNode = z.infer<typeof LoopBreakNodeSchema>;

export const LoopContinueNodeSchema = GraphNodeSchema.extend({
  id: lazySchema(() => z.string()),
  type: lazySchema(() => z.literal('loop-continue')),
  loopExitNodeId: lazySchema(() => z.string()),
});

export type LoopContinueNode = z.infer<typeof LoopContinueNodeSchema>;
