import type { Logger } from '@kbn/core/server';
import type { DataPluginRouter } from '../types';
export declare const INITIAL_SEARCH_SESSION_REST_VERSION = "1";
export declare function registerSessionRoutes(router: DataPluginRouter, logger: Logger): void;
