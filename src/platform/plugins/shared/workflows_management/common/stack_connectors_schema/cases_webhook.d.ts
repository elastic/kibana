/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/cases_webhook/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const CasesWebhookCreateCaseParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        severity: z.ZodOptional<z.ZodString>;
        urgency: z.ZodOptional<z.ZodString>;
        impact: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CasesWebhookUpdateCaseParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        severity: z.ZodOptional<z.ZodString>;
        urgency: z.ZodOptional<z.ZodString>;
        impact: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    incidentId: z.ZodString;
}, z.core.$strip>;
export declare const CasesWebhookCreateCommentParamsSchema: z.ZodObject<{
    incidentId: z.ZodString;
    comment: z.ZodObject<{
        comment: z.ZodString;
        commentId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CasesWebhookResponseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    url: z.ZodString;
    pushedDate: z.ZodString;
}, z.core.$strip>;
