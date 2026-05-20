import type { z } from '@kbn/zod/v4';
import type { AuthType, SSLCertType } from '../constants';
export declare const authTypeSchema: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<AuthType.Basic>, z.ZodLiteral<AuthType.SSL>, z.ZodLiteral<AuthType.OAuth2ClientCredentials>, z.ZodLiteral<null>]>>>;
export declare const hasAuthSchema: z.ZodDefault<z.ZodBoolean>;
export declare const AuthConfiguration: {
    hasAuth: z.ZodDefault<z.ZodBoolean>;
    authType: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<AuthType.Basic>, z.ZodLiteral<AuthType.SSL>, z.ZodLiteral<AuthType.OAuth2ClientCredentials>, z.ZodLiteral<null>]>>>;
    certType: z.ZodOptional<z.ZodEnum<{
        "ssl-crt-key": SSLCertType.CRT;
        "ssl-pfx": SSLCertType.PFX;
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
};
export declare const SecretConfiguration: {
    user: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    password: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    crt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    key: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    pfx: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    clientSecret: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    secretHeaders: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodString>>>;
};
export declare const SecretConfigurationSchemaValidation: {
    validate: (secrets: any) => string | undefined;
};
export declare const SecretConfigurationSchema: z.ZodObject<{
    user: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    password: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    crt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    key: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    pfx: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    clientSecret: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    secretHeaders: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodString>>>;
}, z.core.$strict>;
