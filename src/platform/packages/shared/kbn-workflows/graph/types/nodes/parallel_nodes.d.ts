import { z } from '@kbn/zod/v4';
export declare const EnterParallelNodeConfigurationSchema: z.ZodObject<{
    type: z.ZodLiteral<"parallel">;
    mode: z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>;
    name: z.ZodString;
    timeout: z.ZodOptional<z.ZodString>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    'max-step-size': z.ZodOptional<z.ZodString>;
    'branch-timeout': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EnterParallelNodeConfiguration = z.infer<typeof EnterParallelNodeConfigurationSchema>;
export declare const ParallelBranchDescriptorSchema: z.ZodObject<{
    name: z.ZodString;
    startNodeId: z.ZodString;
}, z.core.$strip>;
export declare const EnterParallelNodeSchema: z.ZodObject<{
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<"enter-parallel">;
    exitNodeId: z.ZodString;
    branchStartNodeId: z.ZodOptional<z.ZodString>;
    branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        startNodeId: z.ZodString;
    }, z.core.$strip>>>;
    configuration: z.ZodObject<{
        type: z.ZodLiteral<"parallel">;
        mode: z.ZodOptional<z.ZodEnum<{
            "fail-fast": "fail-fast";
            settled: "settled";
        }>>;
        name: z.ZodString;
        timeout: z.ZodOptional<z.ZodString>;
        foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
        concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            max: z.ZodOptional<z.ZodNumber>;
            'count-waiting': z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>]>>;
        'max-step-size': z.ZodOptional<z.ZodString>;
        'branch-timeout': z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type EnterParallelNode = z.infer<typeof EnterParallelNodeSchema>;
export declare const ExitParallelNodeSchema: z.ZodObject<{
    stepId: z.ZodString;
    stepType: z.ZodString;
    templateDependencies: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    id: z.ZodString;
    type: z.ZodLiteral<"exit-parallel">;
    startNodeId: z.ZodString;
}, z.core.$strip>;
export type ExitParallelNode = z.infer<typeof ExitParallelNodeSchema>;
