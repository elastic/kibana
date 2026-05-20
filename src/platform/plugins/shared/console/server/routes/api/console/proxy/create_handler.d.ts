import type { Agent } from 'http';
import type { RequestHandler } from '@kbn/core/server';
import type { ESConfigForProxy } from '../../../../types';
import type { RouteDependencies } from '../../..';
import type { Body, Query } from './validation_config';
export declare function getRequestConfig(headers: object, esConfig: ESConfigForProxy): {
    agent: Agent;
    timeout: number;
    headers: object;
};
export declare const createHandler: ({ log, proxy: { readLegacyESConfig }, }: RouteDependencies) => RequestHandler<unknown, Query, Body>;
