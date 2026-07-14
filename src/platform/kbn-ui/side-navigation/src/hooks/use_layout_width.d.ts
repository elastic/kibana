export declare const COLLAPSED_WIDTH = 48;
export declare const EXPANDED_WIDTH = 100;
export declare const SIDE_PANEL_WIDTH = 248;
interface UseLayoutWidthArgs {
    isCollapsed: boolean;
    isSidePanelOpen: boolean;
    setWidth: (width: number) => void;
}
/**
 * Hook for handling layout width changes.
 *
 * @param isCollapsed - whether the side nav is collapsed.
 * @param isSidePanelOpen - whether the side panel is open.
 * @param setWidth - callback to set the width of the navigation component.
 */
export declare const useLayoutWidth: ({ isCollapsed, isSidePanelOpen, setWidth }: UseLayoutWidthArgs) => void;
export {};
