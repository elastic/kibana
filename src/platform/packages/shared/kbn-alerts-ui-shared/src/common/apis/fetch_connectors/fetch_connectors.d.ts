import type { HttpSetup } from '@kbn/core/public';
import type { ActionConnector } from '../../types';
export declare function fetchConnectors({ http, includeSystemActions, }: {
    http: HttpSetup;
    includeSystemActions?: boolean;
}): Promise<ActionConnector[]>;
