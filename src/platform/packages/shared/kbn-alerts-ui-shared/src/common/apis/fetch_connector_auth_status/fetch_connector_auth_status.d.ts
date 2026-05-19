import type { HttpSetup } from '@kbn/core/public';
import type { ConnectorAuthStatusMap } from '@kbn/actions-types';
export declare function fetchConnectorAuthStatus({ http, }: {
    http: HttpSetup;
}): Promise<ConnectorAuthStatusMap>;
