/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/email/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const EmailParamsSchema: z.ZodObject<{
    to: z.ZodArray<z.ZodString>;
    cc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject: z.ZodString;
    message: z.ZodString;
    messageHTML: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const EmailResponseSchema: z.ZodObject<{
    messageId: z.ZodString;
    accepted: z.ZodArray<z.ZodString>;
    rejected: z.ZodArray<z.ZodString>;
    pending: z.ZodArray<z.ZodString>;
    response: z.ZodString;
}, z.core.$strip>;
