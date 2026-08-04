import type { ConnectorAuthStatusMap, ConnectorUserAuthStatus } from '@kbn/actions-types';
export type ConnectorAuthStatusApiResponse = Record<string, {
    user_auth_status: ConnectorUserAuthStatus;
}>;
export declare const transformConnectorAuthStatusResponse: (response: ConnectorAuthStatusApiResponse) => ConnectorAuthStatusMap;
