import { z } from '@kbn/zod/v4';
export declare const ExecuteStatementInputSchema: z.ZodObject<{
    statement: z.ZodString;
    timeout: z.ZodOptional<z.ZodNumber>;
    database: z.ZodOptional<z.ZodString>;
    schema: z.ZodOptional<z.ZodString>;
    warehouse: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    bindings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            DATE: "DATE";
            TEXT: "TEXT";
            BOOLEAN: "BOOLEAN";
            BINARY: "BINARY";
            FIXED: "FIXED";
            REAL: "REAL";
            DECFLOAT: "DECFLOAT";
            TIME: "TIME";
            TIMESTAMP_TZ: "TIMESTAMP_TZ";
            TIMESTAMP_LTZ: "TIMESTAMP_LTZ";
            TIMESTAMP_NTZ: "TIMESTAMP_NTZ";
        }>;
        value: z.ZodString;
    }, z.core.$strip>>>;
    multiStatementCount: z.ZodOptional<z.ZodNumber>;
    queryTag: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ExecuteStatementInput = z.infer<typeof ExecuteStatementInputSchema>;
export declare const RunQueryInputSchema: z.ZodObject<{
    statement: z.ZodString;
    timeout: z.ZodOptional<z.ZodNumber>;
    database: z.ZodOptional<z.ZodString>;
    schema: z.ZodOptional<z.ZodString>;
    warehouse: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    bindings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodEnum<{
            DATE: "DATE";
            TEXT: "TEXT";
            BOOLEAN: "BOOLEAN";
            BINARY: "BINARY";
            FIXED: "FIXED";
            REAL: "REAL";
            DECFLOAT: "DECFLOAT";
            TIME: "TIME";
            TIMESTAMP_TZ: "TIMESTAMP_TZ";
            TIMESTAMP_LTZ: "TIMESTAMP_LTZ";
            TIMESTAMP_NTZ: "TIMESTAMP_NTZ";
        }>;
        value: z.ZodString;
    }, z.core.$strip>>>;
    queryTag: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;
export declare const GetStatementStatusInputSchema: z.ZodObject<{
    statementHandle: z.ZodString;
    partition: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type GetStatementStatusInput = z.infer<typeof GetStatementStatusInputSchema>;
export declare const CancelStatementInputSchema: z.ZodObject<{
    statementHandle: z.ZodString;
}, z.core.$strip>;
export type CancelStatementInput = z.infer<typeof CancelStatementInputSchema>;
export declare const ListCommonQueryParamsSchema: z.ZodObject<{
    like: z.ZodOptional<z.ZodString>;
    startsWith: z.ZodOptional<z.ZodString>;
    showLimit: z.ZodOptional<z.ZodNumber>;
    fromName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ListDatabasesInputSchema: z.ZodObject<{
    like: z.ZodOptional<z.ZodString>;
    startsWith: z.ZodOptional<z.ZodString>;
    showLimit: z.ZodOptional<z.ZodNumber>;
    fromName: z.ZodOptional<z.ZodString>;
    history: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ListDatabasesInput = z.infer<typeof ListDatabasesInputSchema>;
export declare const ListSchemasInputSchema: z.ZodObject<{
    like: z.ZodOptional<z.ZodString>;
    startsWith: z.ZodOptional<z.ZodString>;
    showLimit: z.ZodOptional<z.ZodNumber>;
    fromName: z.ZodOptional<z.ZodString>;
    database: z.ZodString;
}, z.core.$strip>;
export type ListSchemasInput = z.infer<typeof ListSchemasInputSchema>;
export declare const ListTablesInputSchema: z.ZodObject<{
    like: z.ZodOptional<z.ZodString>;
    startsWith: z.ZodOptional<z.ZodString>;
    showLimit: z.ZodOptional<z.ZodNumber>;
    fromName: z.ZodOptional<z.ZodString>;
    database: z.ZodString;
    schema: z.ZodString;
    history: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;
export declare const ListViewsInputSchema: z.ZodObject<{
    like: z.ZodOptional<z.ZodString>;
    startsWith: z.ZodOptional<z.ZodString>;
    showLimit: z.ZodOptional<z.ZodNumber>;
    fromName: z.ZodOptional<z.ZodString>;
    database: z.ZodString;
    schema: z.ZodString;
}, z.core.$strip>;
export type ListViewsInput = z.infer<typeof ListViewsInputSchema>;
export declare const DescribeTableInputSchema: z.ZodObject<{
    database: z.ZodString;
    schema: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;
export declare const DescribeViewInputSchema: z.ZodObject<{
    database: z.ZodString;
    schema: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export type DescribeViewInput = z.infer<typeof DescribeViewInputSchema>;
export declare const ListCortexSearchServicesInputSchema: z.ZodObject<{
    like: z.ZodOptional<z.ZodString>;
    showLimit: z.ZodOptional<z.ZodNumber>;
    fromName: z.ZodOptional<z.ZodString>;
    database: z.ZodString;
    schema: z.ZodString;
}, z.core.$strip>;
export type ListCortexSearchServicesInput = z.infer<typeof ListCortexSearchServicesInputSchema>;
export declare const CortexSearchInputSchema: z.ZodObject<{
    database: z.ZodString;
    schema: z.ZodString;
    serviceName: z.ZodString;
    query: z.ZodString;
    columns: z.ZodOptional<z.ZodArray<z.ZodString>>;
    filter: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CortexSearchInput = z.infer<typeof CortexSearchInputSchema>;
