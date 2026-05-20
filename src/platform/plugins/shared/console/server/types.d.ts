import type { Duration } from 'moment';
import type { ConsoleServerPlugin } from './plugin';
export interface SpecDefinitionsJson {
    name: string;
    globals: Record<string, unknown>;
    endpoints: Record<string, unknown>;
}
/** @public */
export type ConsoleSetup = ReturnType<ConsoleServerPlugin['setup']> extends Promise<infer U> ? U : ReturnType<ConsoleServerPlugin['setup']>;
/** @public */
export interface ConsoleStart {
    getSpecJson: () => SpecDefinitionsJson;
}
/** @internal */
export interface ESConfigForProxy {
    hosts: string[];
    requestHeadersWhitelist: string[];
    customHeaders: Record<string, any>;
    requestTimeout: Duration;
    ssl?: {
        verificationMode: 'none' | 'certificate' | 'full';
        alwaysPresentCertificate: boolean;
        certificateAuthorities?: string[];
        certificate?: string;
        key?: string;
        keyPassphrase?: string;
    };
}
