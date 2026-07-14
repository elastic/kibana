export { convertSecurityApi } from './convert_security_api';
export { getDefaultSecurityImplementation } from './default_implementation';
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
