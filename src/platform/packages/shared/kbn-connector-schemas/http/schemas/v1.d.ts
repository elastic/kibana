import type { z } from '@kbn/zod/v4';
export declare const HTTP_METHODS: readonly ["GET", "POST", "PUT", "PATCH", "DELETE"];
export declare const HeadersSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const ConfigSchema: z.ZodObject<{
    url: z.ZodString;
    headers: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodString>>>;
    hasAuth: z.ZodDefault<z.ZodBoolean>;
    authType: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<import("../../common/auth").AuthType.Basic>, z.ZodLiteral<import("../../common/auth").AuthType.SSL>, z.ZodLiteral<import("../../common/auth").AuthType.OAuth2ClientCredentials>, z.ZodLiteral<null>]>>>;
    certType: z.ZodOptional<z.ZodEnum<{
        "ssl-crt-key": import("../../common/auth").SSLCertType.CRT;
        "ssl-pfx": import("../../common/auth").SSLCertType.PFX;
    }>>;
    ca: z.ZodOptional<z.ZodString>;
    verificationMode: z.ZodOptional<z.ZodEnum<{
        none: "none";
        full: "full";
        certificate: "certificate";
    }>>;
    accessTokenUrl: z.ZodOptional<z.ZodString>;
    clientId: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    proxyUrl: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    proxyVerificationMode: z.ZodOptional<z.ZodEnum<{
        none: "none";
        full: "full";
        certificate: "certificate";
    }>>;
    hasProxyAuth: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const SecretsSchema: z.ZodObject<{
    proxyUsername: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    proxyPassword: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    secretQueryParams: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodString>>>;
    user: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    password: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    crt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    key: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    pfx: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    clientSecret: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    secretHeaders: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodString>>>;
}, z.core.$strict>;
export declare const HttpMethodSchema: z.ZodDefault<z.ZodEnum<{
    GET: "GET";
    POST: "POST";
    DELETE: "DELETE";
    PATCH: "PATCH";
    PUT: "PUT";
}>>;
export declare const HttpRequestBodySchema: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
export declare const ParamsSchema: z.ZodObject<{
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
        max_content_length: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strict>;
