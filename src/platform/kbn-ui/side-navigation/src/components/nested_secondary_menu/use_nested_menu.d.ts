interface NestedMenuContextValue {
    /**
     * Whether the menu can go back to a previous panel.
     * Used to display the "Go back" button in the header.
     */
    canGoBack: boolean;
    /**
     * The ID of the currently open panel.
     */
    currentPanel: string;
    /**
     * Navigate back to the previous panel.
     */
    goBack: () => void;
    /**
     * Navigate to a specific panel by its ID.
     *
     * @param panelId - the ID of the panel to open.
     * @param returnFocusId - (optional) the ID of the element to return focus to.
     */
    goToPanel: (panelId: string, returnFocusId?: string) => void;
    /**
     * How deep into the panel stack the menu currently is (0 = root panel).
     */
    panelStackDepth: number;
    /**
     * (optional) The unique identifier of the element to return focus to when navigating back.
     */
    returnFocusId?: string;
}
export declare const NestedMenuContext: import("react").Context<NestedMenuContextValue | null>;
export declare const useNestedMenu: () => NestedMenuContextValue;
export {};
