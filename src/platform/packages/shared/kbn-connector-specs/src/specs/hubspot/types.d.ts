import { z } from '@kbn/zod/v4';
export declare const SearchCrmObjectsInputSchema: z.ZodObject<{
    objectType: z.ZodEnum<{
        tasks: "tasks";
        notes: "notes";
        meetings: "meetings";
        contacts: "contacts";
        companies: "companies";
        deals: "deals";
        tickets: "tickets";
        calls: "calls";
        emails: "emails";
    }>;
    query: z.ZodOptional<z.ZodString>;
    properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
    limit: z.ZodOptional<z.ZodNumber>;
    after: z.ZodOptional<z.ZodString>;
    includeAssociatedDeals: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type SearchCrmObjectsInput = z.infer<typeof SearchCrmObjectsInputSchema>;
export declare const GetCrmObjectInputSchema: z.ZodObject<{
    objectType: z.ZodEnum<{
        tasks: "tasks";
        notes: "notes";
        meetings: "meetings";
        contacts: "contacts";
        companies: "companies";
        deals: "deals";
        tickets: "tickets";
        calls: "calls";
        emails: "emails";
    }>;
    objectId: z.ZodString;
    properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type GetCrmObjectInput = z.infer<typeof GetCrmObjectInputSchema>;
export declare const ListOwnersInputSchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListOwnersInput = z.infer<typeof ListOwnersInputSchema>;
export declare const SearchDealsInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    pipeline: z.ZodOptional<z.ZodString>;
    dealStage: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SearchDealsInput = z.infer<typeof SearchDealsInputSchema>;
export declare const SearchBroadInputSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type SearchBroadInput = z.infer<typeof SearchBroadInputSchema>;
export declare const ListPipelinesInputSchema: z.ZodObject<{
    objectType: z.ZodOptional<z.ZodEnum<{
        deals: "deals";
        tickets: "tickets";
    }>>;
}, z.core.$strip>;
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;
