import { z } from '@kbn/zod/v4';
export declare const ListPagesInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    spaceId: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    title: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    bodyFormat: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListPagesInput = z.infer<typeof ListPagesInputSchema>;
export declare const GetPageInputSchema: z.ZodObject<{
    id: z.ZodString;
    bodyFormat: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetPageInput = z.infer<typeof GetPageInputSchema>;
export declare const ListSpacesInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    ids: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    keys: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListSpacesInput = z.infer<typeof ListSpacesInputSchema>;
export declare const GetSpaceInputSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type GetSpaceInput = z.infer<typeof GetSpaceInputSchema>;
