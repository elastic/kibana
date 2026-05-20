/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const JiraPushToServiceParamsSchema: z.ZodObject<{
    incident: z.ZodObject<{
        summary: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        issueType: z.ZodString;
        priority: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodArray<z.ZodString>>;
        otherFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
    comments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        comment: z.ZodString;
        commentId: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const JiraGetIncidentParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const JiraGetFieldsParamsSchema: z.ZodObject<{}, z.core.$strip>;
export declare const JiraGetIssueTypesParamsSchema: z.ZodObject<{}, z.core.$strip>;
export declare const JiraGetFieldsByIssueTypeParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const JiraGetIssuesParamsSchema: z.ZodObject<{
    title: z.ZodString;
}, z.core.$strip>;
export declare const JiraGetIssueParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const JiraIssueResponseSchema: z.ZodObject<{
    id: z.ZodString;
    key: z.ZodString;
    title: z.ZodString;
    summary: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    created: z.ZodString;
    updated: z.ZodString;
    status: z.ZodString;
    priority: z.ZodOptional<z.ZodString>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const JiraPushToServiceResponseSchema: z.ZodObject<{
    id: z.ZodString;
    key: z.ZodString;
    title: z.ZodString;
    url: z.ZodString;
}, z.core.$strip>;
export declare const JiraFieldsResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    schema: z.ZodObject<{
        type: z.ZodString;
        system: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    required: z.ZodBoolean;
}, z.core.$strip>>;
export declare const JiraIssueTypesResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    iconUrl: z.ZodOptional<z.ZodString>;
    subtask: z.ZodBoolean;
}, z.core.$strip>>;
export declare const JiraIssuesResponseSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    key: z.ZodString;
    summary: z.ZodString;
    status: z.ZodString;
    created: z.ZodString;
    updated: z.ZodString;
}, z.core.$strip>>;
