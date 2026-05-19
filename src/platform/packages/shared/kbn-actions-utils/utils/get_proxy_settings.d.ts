import type { ProxySettings } from './types';
interface GetProxySettingsOpts {
    url?: string;
    hasAuth?: boolean;
    username?: string;
    password?: string;
    verificationMode?: 'none' | 'certificate' | 'full';
    bypassHosts?: string[];
    onlyHosts?: string[];
    headers?: Record<string, string>;
}
export declare function getProxySettings(opts: GetProxySettingsOpts): ProxySettings | undefined;
export {};
