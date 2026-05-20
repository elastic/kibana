/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/thehive/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare enum TheHiveSeverity {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4
}
export declare enum TheHiveTLP {
    CLEAR = 0,
    GREEN = 1,
    AMBER = 2,
    AMBER_STRICT = 3,
    RED = 4
}
export declare const TheHivePushToServiceParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        externalId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        severity: z.ZodOptional<z.ZodNullable<z.ZodDefault<z.ZodNumber>>>;
        tlp: z.ZodOptional<z.ZodNullable<z.ZodDefault<z.ZodNumber>>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>;
    comments: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        comment: z.ZodString;
        commentId: z.ZodString;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export declare const TheHiveCreateAlertParamsSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodString;
    source: z.ZodString;
    sourceRef: z.ZodString;
    severity: z.ZodOptional<z.ZodNullable<z.ZodDefault<z.ZodNumber>>>;
    isRuleSeverity: z.ZodOptional<z.ZodNullable<z.ZodDefault<z.ZodBoolean>>>;
    tlp: z.ZodOptional<z.ZodNullable<z.ZodDefault<z.ZodNumber>>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    body: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const TheHiveGetIncidentParamsSchema: z.ZodObject<{
    externalId: z.ZodString;
}, z.core.$strip>;
export declare const TheHiveIncidentResponseSchema: z.ZodObject<{
    _id: z.ZodString;
    _type: z.ZodString;
    _createdBy: z.ZodString;
    _updatedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    _createdAt: z.ZodNumber;
    _updatedAt: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    number: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    severity: z.ZodNumber;
    severityLabel: z.ZodString;
    startDate: z.ZodNumber;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    flag: z.ZodBoolean;
    tlp: z.ZodNumber;
    tlpLabel: z.ZodString;
    pap: z.ZodNumber;
    papLabel: z.ZodString;
    status: z.ZodString;
    stage: z.ZodString;
    summary: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    impactStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assignee: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const TheHiveCreateAlertResponseSchema: z.ZodObject<{
    _id: z.ZodString;
    _type: z.ZodString;
    _createdBy: z.ZodString;
    _createdAt: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodString;
    source: z.ZodString;
    sourceRef: z.ZodString;
    severity: z.ZodNumber;
    tlp: z.ZodNumber;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
