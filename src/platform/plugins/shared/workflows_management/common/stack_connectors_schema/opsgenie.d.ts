/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/opsgenie/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const OpsgenieCreateAlertParamsSchema: z.ZodObject<{
    message: z.ZodString;
    alias: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    responders: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            user: "user";
            schedule: "schedule";
            team: "team";
            escalation: "escalation";
        }>;
        name: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    visibleTo: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            user: "user";
            team: "team";
        }>;
        name: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    entity: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<{
        P1: "P1";
        P2: "P2";
        P3: "P3";
        P4: "P4";
        P5: "P5";
    }>>;
    user: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const OpsgenieCloseAlertParamsSchema: z.ZodObject<{
    alias: z.ZodString;
    user: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const OpsgenieResponseSchema: z.ZodObject<{
    result: z.ZodString;
    took: z.ZodNumber;
    requestId: z.ZodString;
}, z.core.$strip>;
