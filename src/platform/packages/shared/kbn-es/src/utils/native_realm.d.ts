import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
export declare const SYSTEM_INDICES_SUPERUSER: string;
interface RetryOpts {
    attempt?: number;
    maxAttempts?: number;
}
interface NativeRealmOptions {
    elasticPassword: string;
    log?: ToolingLog;
    client: Client;
}
export declare class NativeRealm {
    private readonly _elasticPassword;
    private readonly _client;
    private readonly _log;
    constructor({ elasticPassword, log, client }: NativeRealmOptions);
    setPassword(username: string, password?: string | undefined, retryOpts?: RetryOpts): Promise<void>;
    setPasswords(options: Record<string, unknown>): Promise<void>;
    getReservedUsers(retryOpts?: RetryOpts): Promise<string[]>;
    isSecurityEnabled(retryOpts?: RetryOpts): Promise<boolean>;
    private _autoRetry;
    private _createSystemIndicesUser;
}
export {};
