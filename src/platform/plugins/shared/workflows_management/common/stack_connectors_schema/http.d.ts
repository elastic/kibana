/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/http/
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const HttpParamsSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    method: z.ZodDefault<z.ZodEnum<{
        POST: "POST";
        DELETE: "DELETE";
        PUT: "PUT";
        GET: "GET";
        PATCH: "PATCH";
    }>>;
    body: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    timeout: z.ZodOptional<z.ZodNumber>;
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
