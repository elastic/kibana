import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { GetAvailableConnectorsResponse } from '@kbn/workflows/types/v1';
/**
 * Lists all available connector action types and their instances for the workflows feature.
 */
export declare const getAvailableConnectors: (params: {
    getActionsClient: () => Promise<IUnsecuredActionsClient>;
    getActionsClientWithRequest: (request: KibanaRequest) => Promise<PublicMethodsOf<ActionsClient>>;
    spaceId: string;
    request: KibanaRequest;
}) => Promise<GetAvailableConnectorsResponse>;
