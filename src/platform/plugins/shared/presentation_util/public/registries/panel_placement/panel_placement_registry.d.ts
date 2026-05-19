import type { PanelSettingsGetter } from './types';
export declare const registerPanelPlacementSettings: <SerializedState extends object = object>(embeddableType: string, getPanelSettings: PanelSettingsGetter<SerializedState>) => void;
/**
 * Use getPanelPlacementSettings to access registry
 */
export declare const getPanelPlacementSettings: <SerializedState extends object = object>(embeddableType: string, serializedState?: SerializedState) => Promise<Partial<{
    placementSettings: import("./types").PanelPlacementSettings;
    resizeSettings: import("./types").PanelResizeSettings;
}> | undefined>;
