import type { RequestTiming } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardReadResponseBody } from './types';
export declare function read(savedObjectsClient: SavedObjectsClientContract, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>, id: string, useGASchemas: boolean, serverTiming?: RequestTiming, isDashboardAppRequest?: boolean): Promise<{
    body: DashboardReadResponseBody;
    resolveHeaders: Record<string, string>;
}>;
