import type { AsApiContract } from '@kbn/actions-types';
import type { ActionConnectorProps } from '../../types';
export declare const transformConnectorResponse: (results: Array<AsApiContract<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>>>) => Array<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>>;
