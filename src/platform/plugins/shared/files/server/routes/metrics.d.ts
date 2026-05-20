import type { FilesRouter } from './types';
import type { FilesMetrics } from '../../common';
import type { FilesClient } from '../../common/files_client';
import type { CreateRouteDefinition } from './api_routes';
export type Endpoint = CreateRouteDefinition<{}, FilesMetrics, FilesClient['getMetrics']>;
export declare function register(router: FilesRouter): void;
