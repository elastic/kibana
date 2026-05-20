import { z } from '@kbn/zod/v4';
export declare const SearchInputSchema: z.ZodObject<{
    table: z.ZodString;
    query: z.ZodString;
    encodedQuery: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export declare const GetRecordInputSchema: z.ZodObject<{
    table: z.ZodString;
    sysId: z.ZodString;
    fields: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetRecordInput = z.infer<typeof GetRecordInputSchema>;
export declare const ListRecordsInputSchema: z.ZodObject<{
    table: z.ZodString;
    encodedQuery: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    orderBy: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListRecordsInput = z.infer<typeof ListRecordsInputSchema>;
export declare const ListTablesInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;
export declare const ListKnowledgeBasesInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ListKnowledgeBasesInput = z.infer<typeof ListKnowledgeBasesInputSchema>;
export declare const GetCommentsInputSchema: z.ZodObject<{
    tableName: z.ZodString;
    recordSysId: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type GetCommentsInput = z.infer<typeof GetCommentsInputSchema>;
export declare const GetAttachmentInputSchema: z.ZodObject<{
    sysId: z.ZodString;
}, z.core.$strip>;
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;
export declare const DescribeTableInputSchema: z.ZodObject<{
    table: z.ZodString;
}, z.core.$strip>;
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;
