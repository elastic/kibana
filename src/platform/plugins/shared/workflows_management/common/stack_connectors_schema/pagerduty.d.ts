/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/pagerduty/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const PagerDutyParamsSchema: z.ZodObject<{
    eventAction: z.ZodEnum<{
        resolve: "resolve";
        trigger: "trigger";
        acknowledge: "acknowledge";
    }>;
    dedupKey: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<{
        error: "error";
        info: "info";
        warning: "warning";
        critical: "critical";
    }>>;
    timestamp: z.ZodOptional<z.ZodString>;
    component: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    class: z.ZodOptional<z.ZodString>;
    customDetails: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        href: z.ZodString;
        text: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    images: z.ZodOptional<z.ZodArray<z.ZodObject<{
        src: z.ZodString;
        href: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const PagerDutyResponseSchema: z.ZodObject<{
    status: z.ZodString;
    message: z.ZodString;
    dedup_key: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
