/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
/** @public */
export interface PollEsNodesVersionOptions {
    internalClient: ElasticsearchClient;
    log: Logger;
    kibanaVersion: string;
    /** @default false */
    ignoreVersionMismatch: boolean;
    /** @default 2500ms */
    healthCheckInterval: number;
    /** @default ${healthCheckInterval} */
    healthCheckFailureInterval?: number;
    healthCheckStartupInterval?: number;
    /** @default 3 */
    healthCheckRetry: number;
}
/** @public */
export interface NodeInfo {
    version: string;
    ip: string;
    http?: {
        publish_address: string;
    };
    name: string;
}
export interface NodesInfo {
    nodes: {
        [key: string]: NodeInfo;
    };
}
export interface NodesVersionCompatibility {
    isCompatible: boolean;
    message?: string;
    incompatibleNodes: NodeInfo[];
    warningNodes: NodeInfo[];
    kibanaVersion: string;
    nodesInfoRequestError?: Error;
}
export declare function mapNodesVersionCompatibility(nodesInfoResponse: NodesInfo & {
    nodesInfoRequestError?: Error;
}, kibanaVersion: string, ignoreVersionMismatch: boolean): NodesVersionCompatibility;
/** @public */
export declare const pollEsNodesVersion: ({ internalClient, log, kibanaVersion, ignoreVersionMismatch, healthCheckInterval, healthCheckFailureInterval, healthCheckStartupInterval, healthCheckRetry, }: PollEsNodesVersionOptions) => Observable<NodesVersionCompatibility>;
