import type { ControlGroupRendererApi, ControlGroupRuntimeState } from '@kbn/control-group-renderer';
import type { FilterControlConfig } from './types';
export interface FilterGroupContextType {
    initialControls: FilterControlConfig[];
    dataViewId: string;
    controlGroup: ControlGroupRendererApi | undefined;
    controlGroupStateUpdates: ControlGroupRuntimeState | undefined;
    isViewMode: boolean;
    hasPendingChanges: boolean;
    pendingChangesPopoverOpen: boolean;
    closePendingChangesPopover: () => void;
    openPendingChangesPopover: () => void;
    switchToViewMode: () => void;
    switchToEditMode: () => void;
    setHasPendingChanges: (value: boolean) => void;
    setShowFiltersChangedBanner: (value: boolean) => void;
    saveChangesHandler: () => void;
    discardChangesHandler: () => void;
}
export declare const FilterGroupContext: import("react").Context<FilterGroupContextType | undefined>;
