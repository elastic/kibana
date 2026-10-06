/**
 * This API can focus a child panel
 */
export interface CanFocusPanel {
    setFocusedPanelId: (panelId?: string) => void;
}
/**
 * A type guard which can be used to determine if a given API can focus a child panel
 */
export declare const apiCanFocusPanel: (api: unknown) => api is CanFocusPanel;
