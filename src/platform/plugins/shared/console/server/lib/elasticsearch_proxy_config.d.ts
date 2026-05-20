import http from 'http';
import type { ESConfigForProxy } from '../types';
export declare const getElasticsearchProxyConfig: (legacyConfig: ESConfigForProxy) => {
    timeout: number;
    agent: http.Agent;
};
