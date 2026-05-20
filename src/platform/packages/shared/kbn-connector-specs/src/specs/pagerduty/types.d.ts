import { z } from '@kbn/zod/v4';
export declare const ListToolsInputSchema: z.ZodObject<{}, z.core.$strip>;
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;
export declare const GetUserDataInputSchema: z.ZodObject<{}, z.core.$strip>;
export type GetUserDataInput = z.infer<typeof GetUserDataInputSchema>;
export declare const ListSchedulesInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    include: z.ZodOptional<z.ZodArray<z.ZodString>>;
    team_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    user_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ListSchedulesInput = z.infer<typeof ListSchedulesInputSchema>;
export declare const ListEscalationPoliciesInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    user_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    team_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ListEscalationPoliciesInput = z.infer<typeof ListEscalationPoliciesInputSchema>;
export declare const ListIncidentsInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodArray<z.ZodString>>;
    service_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    user_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    since: z.ZodOptional<z.ZodString>;
    until: z.ZodOptional<z.ZodString>;
    urgencies: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_scope: z.ZodOptional<z.ZodEnum<{
        all: "all";
        teams: "teams";
        assigned: "assigned";
    }>>;
    sort_by: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ListIncidentsInput = z.infer<typeof ListIncidentsInputSchema>;
export declare const ListOncallsInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    schedule_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    user_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    escalation_policy_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    since: z.ZodOptional<z.ZodString>;
    until: z.ZodOptional<z.ZodString>;
    time_zone: z.ZodOptional<z.ZodString>;
    earliest: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ListOncallsInput = z.infer<typeof ListOncallsInputSchema>;
export declare const ListUsersInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;
export declare const ListTeamsInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ListTeamsInput = z.infer<typeof ListTeamsInputSchema>;
export declare const GetScheduleInputSchema: z.ZodObject<{
    schedule_id: z.ZodString;
}, z.core.$strip>;
export type GetScheduleInput = z.infer<typeof GetScheduleInputSchema>;
export declare const GetIncidentInputSchema: z.ZodObject<{
    incident_id: z.ZodString;
}, z.core.$strip>;
export type GetIncidentInput = z.infer<typeof GetIncidentInputSchema>;
export declare const GetEscalationPolicyInputSchema: z.ZodObject<{
    policy_id: z.ZodString;
}, z.core.$strip>;
export type GetEscalationPolicyInput = z.infer<typeof GetEscalationPolicyInputSchema>;
export declare const GetTeamInputSchema: z.ZodObject<{
    team_id: z.ZodString;
}, z.core.$strip>;
export type GetTeamInput = z.infer<typeof GetTeamInputSchema>;
export declare const CallToolInputSchema: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
