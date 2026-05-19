import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
export interface WaitOptions {
    client: Client;
    log: ToolingLog;
    readyTimeout?: number;
}
/**
 * General method to wait for the ES cluster status to be yellow or green
 */
export declare function waitForSecurityIndex({ client, log, readyTimeout, }: WaitOptions): Promise<void>;
