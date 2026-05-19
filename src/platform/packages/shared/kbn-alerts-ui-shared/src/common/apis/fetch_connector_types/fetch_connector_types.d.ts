import type { HttpSetup } from '@kbn/core/public';
import type { ActionType } from '@kbn/actions-types';
export declare const fetchConnectorTypes: ({ http, featureId, includeSystemActions, }: {
    http: HttpSetup;
    featureId?: string;
    includeSystemActions?: boolean;
}) => Promise<ActionType[]>;
