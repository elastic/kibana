import { z } from '@kbn/zod/v4';
export declare const ODataCollectionOutputSchema: z.ZodObject<{
    value: z.ZodArray<z.ZodAny>;
}, z.core.$strip>;
export declare const GetListItemsInputSchema: z.ZodObject<{
    listTitle: z.ZodString;
}, z.core.$strip>;
export declare const GetFolderContentsInputSchema: z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>;
export declare const GetFolderContentsOutputSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodAny>;
    folders: z.ZodArray<z.ZodAny>;
}, z.core.$strip>;
export declare const DownloadFileInputSchema: z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>;
export declare const DownloadFileOutputSchema: z.ZodObject<{
    contentType: z.ZodOptional<z.ZodString>;
    contentLength: z.ZodOptional<z.ZodString>;
    text: z.ZodString;
}, z.core.$strip>;
export declare const GetSitePageContentsInputSchema: z.ZodObject<{
    pageId: z.ZodNumber;
}, z.core.$strip>;
export declare const SearchInputSchema: z.ZodObject<{
    query: z.ZodString;
    from: z.ZodDefault<z.ZodNumber>;
    size: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const CallRestApiInputSchema: z.ZodObject<{
    method: z.ZodEnum<{
        POST: "POST";
        GET: "GET";
    }>;
    path: z.ZodString;
    body: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
