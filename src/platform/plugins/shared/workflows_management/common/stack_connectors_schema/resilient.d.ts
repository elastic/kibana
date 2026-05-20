/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/resilient/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const ResilientCreateIncidentParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        incidentTypes: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        severityCode: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ResilientUpdateIncidentParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        incidentTypes: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        severityCode: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    incidentId: z.ZodString;
}, z.core.$strip>;
export declare const ResilientAddCommentParamsSchema: z.ZodObject<{
    incidentId: z.ZodString;
    comment: z.ZodObject<{
        text: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ResilientIncidentResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    discovered_date: z.ZodNumber;
    create_date: z.ZodNumber;
    severity_code: z.ZodOptional<z.ZodNumber>;
    incident_type_ids: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
