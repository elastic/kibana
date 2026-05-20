import type { PanelPackage } from './presentation_container';
/**
 * This API can add a new panel as a child.
 */
export interface CanAddNewPanel {
    addNewPanel: <StateType extends object, ApiType extends unknown = unknown>(panel: PanelPackage<StateType>, options?: {
        displaySuccessMessage?: boolean;
        scrollToPanel?: boolean;
        beside?: string;
    }) => Promise<ApiType | undefined>;
}
/**
 * A type guard which can be used to determine if a given API can add a new panel.
 */
export declare const apiCanAddNewPanel: (api: unknown) => api is CanAddNewPanel;
