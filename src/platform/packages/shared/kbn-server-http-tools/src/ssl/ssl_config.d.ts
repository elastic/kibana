import type { TypeOf } from '@kbn/config-schema';
export declare const sslSchema: import("@kbn/config-schema").ObjectType<{
    certificate: import("@kbn/config-schema").Type<string | undefined>;
    certificateAuthorities: import("@kbn/config-schema").Type<string | string[] | undefined>;
    cipherSuites: import("@kbn/config-schema").Type<string[]>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    key: import("@kbn/config-schema").Type<string | undefined>;
    keyPassphrase: import("@kbn/config-schema").Type<string | undefined>;
    keystore: import("@kbn/config-schema").ObjectType<{
        path: import("@kbn/config-schema").Type<string | undefined>;
        password: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    truststore: import("@kbn/config-schema").ObjectType<{
        path: import("@kbn/config-schema").Type<string | undefined>;
        password: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    redirectHttpFromPort: import("@kbn/config-schema").Type<number | undefined>;
    supportedProtocols: import("@kbn/config-schema").Type<string[]>;
    clientAuthentication: import("@kbn/config-schema").Type<"optional" | "none" | "required">;
}>;
type SslConfigType = TypeOf<typeof sslSchema>;
export declare class SslConfig {
    enabled: boolean;
    redirectHttpFromPort?: number;
    key?: string;
    certificate?: string;
    certificateAuthorities?: string[];
    keyPassphrase?: string;
    requestCert: boolean;
    rejectUnauthorized: boolean;
    cipherSuites: string[];
    supportedProtocols: string[];
    /**
     * @internal
     */
    constructor(config: SslConfigType);
    /**
     * Options that affect the OpenSSL protocol behavior via numeric bitmask of the SSL_OP_* options from OpenSSL Options.
     */
    getSecureOptions(): number;
    isEqualTo(otherConfig: SslConfig): boolean;
}
export {};
