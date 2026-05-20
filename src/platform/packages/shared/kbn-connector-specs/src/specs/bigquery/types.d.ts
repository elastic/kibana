import type { z } from '@kbn/zod/v4';
export declare const RunQueryInputSchema: z.ZodObject<{
    location: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    useQueryCache: z.ZodOptional<z.ZodBoolean>;
    query: z.ZodString;
}, z.core.$strip>;
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;
export declare const ExecuteQueryInputSchema: z.ZodObject<{
    query: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    useQueryCache: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ExecuteQueryInput = z.infer<typeof ExecuteQueryInputSchema>;
export declare const GetQueryResultsInputSchema: z.ZodObject<{
    jobId: z.ZodString;
    projectId: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type GetQueryResultsInput = z.infer<typeof GetQueryResultsInputSchema>;
export declare const ListDatasetsInputSchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListDatasetsInput = z.infer<typeof ListDatasetsInputSchema>;
