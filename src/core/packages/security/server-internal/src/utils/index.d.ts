export { convertSecurityApi } from './convert_security_api';
export { getDefaultSecurityImplementation } from './default_implementation';
export { createPluginScopedServiceAccounts } from './plugin_scoped_service_accounts';
export type { PluginScopedServiceAccountsOptions } from './plugin_scoped_service_accounts';
export interface SecurityServiceConfigType {
    fipsMode?: {
        enabled: boolean;
    };
    uiam?: {
        enabled: false;
    } | {
        enabled: true;
        sharedSecret: string;
    };
}
export interface PKCS12ConfigType {
    ssl?: {
        keystore?: {
            path?: string;
        };
        truststore?: {
            path?: string;
        };
    };
}
