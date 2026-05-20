import type { Action } from '@kbn/ui-actions-plugin/public';
interface ActionEventHandler {
    onClick: () => void;
}
interface UseLensExtraActions {
    copyToDashboard?: ActionEventHandler;
    viewDetails?: ActionEventHandler;
    exploreInDiscoverTab?: ActionEventHandler;
}
export declare const useLensExtraActions: (config: UseLensExtraActions) => Action[];
export {};
