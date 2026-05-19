import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
export type ClusterReadyStatus = 'green' | 'yellow';
export interface WaitOptions {
    client: Client;
    expectedStatus: ClusterReadyStatus;
    log: ToolingLog;
    readyTimeout?: number;
}
/**
 * General method to wait for the ES cluster status to be yellow or green
 */
export declare function waitUntilClusterReady({ client, expectedStatus, log, readyTimeout, }: WaitOptions): Promise<void>;
