import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { Trigger } from '../types';
import type { Action, ActionInternal } from '../actions';
export declare const defaultTitle: string;
export declare const txtMore: string;
export interface ActionWithContext<Context extends object = object> {
    action: Action<Context> | ActionInternal<Context>;
    context: Context;
    /**
     * Trigger that caused this action
     */
    trigger: Trigger;
}
export interface BuildContextMenuParams {
    actions: ActionWithContext[];
    title?: string;
    closeMenu?: () => void;
}
/**
 * Transforms an array of Actions to the shape EuiContextMenuPanel expects.
 */
export declare function buildContextMenuForActions({ actions, title, closeMenu, }: BuildContextMenuParams): Promise<EuiContextMenuPanelDescriptor[]>;
