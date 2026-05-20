import { z } from '@kbn/zod/v4';
export declare const WorkflowsRuleActionParamsSchema: import("@kbn/config-schema").ObjectType<{
    subAction: import("@kbn/config-schema").Type<"run">;
    subActionParams: import("@kbn/config-schema").ObjectType<{
        workflowId: import("@kbn/config-schema").Type<string>;
        inputs: import("@kbn/config-schema").Type<any>;
        summaryMode: import("@kbn/config-schema").Type<boolean | undefined>;
        alertStates: import("@kbn/config-schema").Type<Readonly<{
            new?: boolean | undefined;
            ongoing?: boolean | undefined;
            recovered?: boolean | undefined;
        } & {}> | undefined>;
    }>;
}>;
export declare const ExecutorParamsSchema: z.ZodObject<{
    subAction: z.ZodLiteral<"run">;
    subActionParams: z.ZodObject<{
        workflowId: z.ZodString;
        inputs: z.ZodOptional<z.ZodAny>;
        spaceId: z.ZodString;
        summaryMode: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        alertStates: z.ZodOptional<z.ZodObject<{
            new: z.ZodOptional<z.ZodBoolean>;
            ongoing: z.ZodOptional<z.ZodBoolean>;
            recovered: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
    }, z.core.$strip>;
}, z.core.$strict>;
export declare const ExecutorSubActionRunParamsSchema: z.ZodObject<{
    workflowId: z.ZodString;
    inputs: z.ZodOptional<z.ZodAny>;
    spaceId: z.ZodString;
    summaryMode: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    alertStates: z.ZodOptional<z.ZodObject<{
        new: z.ZodOptional<z.ZodBoolean>;
        ongoing: z.ZodOptional<z.ZodBoolean>;
        recovered: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
}, z.core.$strip>;
