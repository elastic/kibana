import { z } from '@kbn/zod/v4';
export declare const SearchIssuesWithJqlInputSchema: z.ZodObject<{
    jql: z.ZodString;
    maxResults: z.ZodOptional<z.ZodNumber>;
    nextPageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SearchIssuesWithJqlInput = z.infer<typeof SearchIssuesWithJqlInputSchema>;
export declare const GetIssueInputSchema: z.ZodObject<{
    issueId: z.ZodString;
}, z.core.$strip>;
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;
export declare const GetProjectsInputSchema: z.ZodObject<{
    maxResults: z.ZodOptional<z.ZodNumber>;
    startAt: z.ZodOptional<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetProjectsInput = z.infer<typeof GetProjectsInputSchema>;
export declare const GetProjectInputSchema: z.ZodObject<{
    projectId: z.ZodString;
}, z.core.$strip>;
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;
export declare const SearchUsersInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    accountId: z.ZodOptional<z.ZodString>;
    startAt: z.ZodOptional<z.ZodNumber>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    property: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;
