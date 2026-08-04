import type { Logger } from '@kbn/logging';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-server';
import type { DataPluginRouter } from '../types';
export declare const SEARCH_API_BASE_URL = "/internal/search";
export declare function registerSearchRoute(router: DataPluginRouter, logger: Logger, executionContextSetup: ExecutionContextSetup): void;
