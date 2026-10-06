/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
export declare const EnterParallelNodeConfigurationSchema: z.ZodObject<
  {
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    concurrency: z.ZodOptional<
      z.ZodUnion<
        readonly [
          z.ZodNumber,
          z.ZodObject<
            {
              max: z.ZodOptional<z.ZodNumber>;
              'count-waiting': z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        ]
      >
    >;
    mode: z.ZodOptional<
      z.ZodEnum<{
        'fail-fast': 'fail-fast';
        settled: 'settled';
      }>
    >;
    'branch-timeout': z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<'parallel'>;
  },
  z.core.$strip
>;
export type EnterParallelNodeConfiguration = z.infer<typeof EnterParallelNodeConfigurationSchema>;
export declare const ParallelBranchDescriptorSchema: z.ZodObject<
  {
    name: z.ZodString;
    startNodeId: z.ZodString;
  },
  z.core.$strip
>;
export declare const EnterParallelNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<'enter-parallel'>;
    exitNodeId: z.ZodString;
    branchStartNodeId: z.ZodOptional<z.ZodString>;
    branches: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            name: z.ZodString;
            startNodeId: z.ZodString;
          },
          z.core.$strip
        >
      >
    >;
    configuration: z.ZodObject<
      {
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
        concurrency: z.ZodOptional<
          z.ZodUnion<
            readonly [
              z.ZodNumber,
              z.ZodObject<
                {
                  max: z.ZodOptional<z.ZodNumber>;
                  'count-waiting': z.ZodOptional<z.ZodBoolean>;
                },
                z.core.$strip
              >
            ]
          >
        >;
        mode: z.ZodOptional<
          z.ZodEnum<{
            'fail-fast': 'fail-fast';
            settled: 'settled';
          }>
        >;
        'branch-timeout': z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<'parallel'>;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
export type EnterParallelNode = z.infer<typeof EnterParallelNodeSchema>;
export declare const ExitParallelNodeSchema: z.ZodObject<
  {
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<'exit-parallel'>;
    startNodeId: z.ZodString;
  },
  z.core.$strip
>;
export type ExitParallelNode = z.infer<typeof ExitParallelNodeSchema>;
