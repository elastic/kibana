/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
export declare const LoopBreakNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<'loop-break'>;
    loopExitNodeId: z.ZodString;
    loopStepId: z.ZodString;
  },
  z.core.$strip
>;
export type LoopBreakNode = z.infer<typeof LoopBreakNodeSchema>;
export declare const LoopContinueNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<'loop-continue'>;
    loopExitNodeId: z.ZodString;
  },
  z.core.$strip
>;
export type LoopContinueNode = z.infer<typeof LoopContinueNodeSchema>;
