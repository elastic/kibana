import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-types';
import type { ActionConnectorProps, ActionConnector } from '../../types';
export declare function fetchConnector(id: string, { http }: {
    http: HttpSetup;
}): Promise<ActionConnector>;
export declare const transformConnectorResponse: (result: AsApiContract<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>>) => ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>;
