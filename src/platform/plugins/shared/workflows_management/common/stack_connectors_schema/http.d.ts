import { z } from '@kbn/zod/v4';
export declare const HttpParamsSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    method: z.ZodDefault<z.ZodEnum<{
        GET: "GET";
        POST: "POST";
        DELETE: "DELETE";
        PATCH: "PATCH";
        PUT: "PUT";
    }>>;
    body: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    fetcher: z.ZodOptional<z.ZodObject<{
        skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
        follow_redirects: z.ZodOptional<z.ZodBoolean>;
        max_redirects: z.ZodOptional<z.ZodNumber>;
        keep_alive: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const HttpResponseSchema: z.ZodObject<{
    status: z.ZodNumber;
    statusText: z.ZodString;
    data: z.ZodAny;
    headers: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip>;
