import type { TypeOf } from '@kbn/config-schema';
export declare const customHostSettingsSchema: import("@kbn/config-schema").ObjectType<{
    url: import("@kbn/config-schema").Type<string>;
    smtp: import("@kbn/config-schema").Type<Readonly<{
        ignoreTLS?: boolean | undefined;
        requireTLS?: boolean | undefined;
    } & {}> | undefined>;
    ssl: import("@kbn/config-schema").Type<Readonly<{
        verificationMode?: "full" | "none" | "certificate" | undefined;
        certificateAuthoritiesFiles?: string | string[] | undefined;
        certificateAuthoritiesData?: string | undefined;
    } & {}> | undefined>;
}>;
export type CustomHostSettings = TypeOf<typeof customHostSettingsSchema>;
export interface SSLSettings {
    verificationMode?: 'none' | 'certificate' | 'full';
    pfx?: Buffer;
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
    ca?: Buffer;
}
export interface ProxySettings {
    proxyUrl: string;
    proxyBypassHosts: Set<string> | undefined;
    proxyOnlyHosts: Set<string> | undefined;
    proxyHeaders?: Record<string, string>;
    proxySSLSettings: SSLSettings;
}
