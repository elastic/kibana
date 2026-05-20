/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/server_log/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const ServerLogParamsSchema: z.ZodObject<{
    message: z.ZodString;
    level: z.ZodOptional<z.ZodEnum<{
        error: "error";
        info: "info";
        debug: "debug";
        warn: "warn";
        fatal: "fatal";
        trace: "trace";
    }>>;
}, z.core.$strip>;
export declare const ServerLogResponseSchema: z.ZodObject<{
    actionId: z.ZodString;
}, z.core.$strip>;
