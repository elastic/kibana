/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/swimlane/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const SwimlaneCreateRecordParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        ruleName: z.ZodString;
        alertId: z.ZodString;
        severity: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    comments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        comment: z.ZodString;
        commentId: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const SwimlaneUpdateRecordParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        ruleName: z.ZodString;
        alertId: z.ZodString;
        severity: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    incidentId: z.ZodString;
    comments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        comment: z.ZodString;
        commentId: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const SwimlaneResponseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    url: z.ZodString;
    pushedDate: z.ZodString;
}, z.core.$strip>;
