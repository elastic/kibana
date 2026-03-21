import type { ActionType } from '@kbn/actions-types';
import type { ActionConnector } from '../common/types';
export interface IsEnabledResult {
    isEnabled: true;
}
export interface IsDisabledResult {
    isEnabled: false;
    message: string;
    messageCard: JSX.Element;
}
export declare const checkActionTypeEnabled: (actionType?: ActionType, isPreconfiguredConnector?: boolean) => IsEnabledResult | IsDisabledResult;
export declare const checkActionFormActionTypeEnabled: (actionType: ActionType, preconfiguredConnectors: ActionConnector[]) => IsEnabledResult | IsDisabledResult;
