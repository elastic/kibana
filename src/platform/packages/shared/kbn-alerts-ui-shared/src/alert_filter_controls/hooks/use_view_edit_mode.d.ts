import type { ViewMode } from '@kbn/presentation-publishing';
interface UseViewEditModeArgs {
    initialMode?: ViewMode;
}
export declare const useViewEditMode: ({ initialMode }: UseViewEditModeArgs) => {
    filterGroupMode: "view" | "edit" | "preview" | "print";
    isViewMode: boolean;
    hasPendingChanges: boolean;
    pendingChangesPopoverOpen: boolean;
    closePendingChangesPopover: () => void;
    openPendingChangesPopover: () => void;
    switchToEditMode: () => void;
    switchToViewMode: () => void;
    setHasPendingChanges: import("react").Dispatch<import("react").SetStateAction<boolean>>;
};
export {};
