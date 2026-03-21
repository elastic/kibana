import type { MaybePromise } from '@kbn/utility-types';
import type { PanelPlacementStrategy } from './constants';
export interface PanelPlacementSettings {
    strategy?: PanelPlacementStrategy;
    height?: number;
    width?: number;
}
export interface PanelResizeSettings {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
}
export type PanelSettings = Partial<{
    placementSettings: PanelPlacementSettings;
    resizeSettings: PanelResizeSettings;
}>;
export type PanelSettingsGetter<SerializedState extends object = object> = (serializedState?: SerializedState) => MaybePromise<PanelSettings>;
