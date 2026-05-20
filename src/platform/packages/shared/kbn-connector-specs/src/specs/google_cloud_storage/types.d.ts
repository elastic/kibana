import { z } from '@kbn/zod/v4';
export declare const ListProjectsInputSchema: z.ZodObject<{
    pageSize: z.ZodOptional<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;
export declare const ListBucketsInputSchema: z.ZodObject<{
    project: z.ZodString;
    maxResults: z.ZodOptional<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
    prefix: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListBucketsInput = z.infer<typeof ListBucketsInputSchema>;
export declare const ListObjectsInputSchema: z.ZodObject<{
    bucket: z.ZodString;
    prefix: z.ZodOptional<z.ZodString>;
    delimiter: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListObjectsInput = z.infer<typeof ListObjectsInputSchema>;
export declare const GetObjectMetadataInputSchema: z.ZodObject<{
    bucket: z.ZodString;
    object: z.ZodString;
}, z.core.$strip>;
export type GetObjectMetadataInput = z.infer<typeof GetObjectMetadataInputSchema>;
export declare const DownloadObjectInputSchema: z.ZodObject<{
    bucket: z.ZodString;
    object: z.ZodString;
    maximumDownloadSizeBytes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type DownloadObjectInput = z.infer<typeof DownloadObjectInputSchema>;
