/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/servicenow_itsm/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const ServiceNowCreateIncidentParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        short_description: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        impact: z.ZodOptional<z.ZodString>;
        urgency: z.ZodOptional<z.ZodString>;
        severity: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        subcategory: z.ZodOptional<z.ZodString>;
        correlation_id: z.ZodOptional<z.ZodString>;
        correlation_display: z.ZodOptional<z.ZodString>;
        additional_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ServiceNowUpdateIncidentParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        short_description: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        impact: z.ZodOptional<z.ZodString>;
        urgency: z.ZodOptional<z.ZodString>;
        severity: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        subcategory: z.ZodOptional<z.ZodString>;
        correlation_id: z.ZodOptional<z.ZodString>;
        correlation_display: z.ZodOptional<z.ZodString>;
        additional_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
    incidentId: z.ZodString;
}, z.core.$strip>;
export declare const ServiceNowGetIncidentParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const ServiceNowGetFieldsParamsSchema: z.ZodObject<{}, z.core.$strip>;
export declare const ServiceNowGetChoicesParamsSchema: z.ZodObject<{
    fields: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const ServiceNowCloseIncidentParamsSchema: z.ZodObject<{
    incidentId: z.ZodString;
    closeCode: z.ZodOptional<z.ZodString>;
    closeNotes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ServiceNowAddEventParamsSchema: z.ZodObject<{
    source: z.ZodString;
    node: z.ZodString;
    type: z.ZodString;
    resource: z.ZodOptional<z.ZodString>;
    metric_name: z.ZodOptional<z.ZodString>;
    event_class: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    additional_info: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export declare const ServiceNowCreateSecurityIncidentParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        short_description: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        dest_ip: z.ZodOptional<z.ZodString>;
        source_ip: z.ZodOptional<z.ZodString>;
        malware_hash: z.ZodOptional<z.ZodString>;
        malware_url: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodString>;
        additional_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ServiceNowIncidentResponseSchema: z.ZodObject<{
    sys_id: z.ZodString;
    number: z.ZodString;
    short_description: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    state: z.ZodString;
    impact: z.ZodOptional<z.ZodString>;
    urgency: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodString>;
    sys_created_on: z.ZodString;
    sys_updated_on: z.ZodString;
}, z.core.$strip>;
export declare const ServiceNowFieldsResponseSchema: z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    label: z.ZodString;
    type: z.ZodString;
    mandatory: z.ZodBoolean;
    choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>>;
export declare const ServiceNowChoicesResponseSchema: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>>>;
export declare const ServiceNowEventResponseSchema: z.ZodObject<{
    sys_id: z.ZodString;
    number: z.ZodString;
    state: z.ZodString;
    sys_created_on: z.ZodString;
}, z.core.$strip>;
