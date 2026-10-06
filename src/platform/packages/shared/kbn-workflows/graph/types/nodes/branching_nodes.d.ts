/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
export declare const EnterIfNodeConfigurationSchema: z.ZodObject<
  {
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    condition: z.ZodString;
    if: z.ZodOptional<z.ZodNever>;
    type: z.ZodLiteral<'if'>;
  },
  z.core.$strip
>;
export declare const EnterIfNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<'enter-if'>;
    exitNodeId: z.ZodString;
    configuration: z.ZodObject<
      {
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        condition: z.ZodString;
        if: z.ZodOptional<z.ZodNever>;
        type: z.ZodLiteral<'if'>;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
export type EnterIfNode = z.infer<typeof EnterIfNodeSchema>;
export declare const EnterConditionBranchNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodUnion<
      readonly [z.ZodLiteral<'enter-then-branch'>, z.ZodLiteral<'enter-else-branch'>]
    >;
    condition: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodUndefined]>>;
  },
  z.core.$strip
>;
export type EnterConditionBranchNode = z.infer<typeof EnterConditionBranchNodeSchema>;
export declare const ExitConditionBranchNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodUnion<readonly [z.ZodLiteral<'exit-then-branch'>, z.ZodLiteral<'exit-else-branch'>]>;
    startNodeId: z.ZodString;
  },
  z.core.$strip
>;
export type ExitConditionBranchNode = z.infer<typeof ExitConditionBranchNodeSchema>;
export declare const ExitIfNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<'exit-if'>;
    startNodeId: z.ZodString;
  },
  z.core.$strip
>;
export type ExitIfNode = z.infer<typeof ExitIfNodeSchema>;
