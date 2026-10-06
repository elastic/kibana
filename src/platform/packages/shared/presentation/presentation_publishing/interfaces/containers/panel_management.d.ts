import type { PublishingSubject } from '../../publishing_subject';
import type { PanelPackage } from './presentation_container';
export interface CanDuplicatePanels {
    duplicatePanel: (panelId: string) => void;
}
export declare const apiCanDuplicatePanels: (unknownApi: unknown | null) => unknownApi is CanDuplicatePanels;
export interface CanExpandPanels {
    expandPanel: (panelId: string) => void;
    expandedPanelId$: PublishingSubject<string | undefined>;
}
export declare const apiCanExpandPanels: (unknownApi: unknown | null) => unknownApi is CanExpandPanels;
export interface HasPinnedPanels {
    panelIsPinned: (panelId: string) => boolean;
}
export interface CanPinPanels extends HasPinnedPanels {
    pinPanel: (panelId: string) => void;
    unpinPanel: (panelId: string) => void;
    addPinnedPanel: <StateType extends object, ApiType extends unknown = unknown>(panel: PanelPackage<StateType>) => Promise<ApiType | undefined>;
}
export declare const apiHasPinnedPanels: (api: unknown) => api is HasPinnedPanels;
export declare const apiCanPinPanels: (api: unknown) => api is CanPinPanels;
