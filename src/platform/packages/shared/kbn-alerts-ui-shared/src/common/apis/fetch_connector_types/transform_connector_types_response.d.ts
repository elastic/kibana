import type { AsApiContract, ActionType } from '@kbn/actions-types';
export declare const transformConnectorTypesResponse: (results: Array<AsApiContract<ActionType>>) => ActionType[];
