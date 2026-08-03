import type { GridAccessMode, GridLayoutData, GridLayoutStateManager, GridSettings } from './types';
export declare const useGridLayoutState: ({ layout, layoutRef, gridSettings, expandedPanelId, accessMode, }: {
    layout: GridLayoutData;
    layoutRef: React.MutableRefObject<HTMLDivElement | null>;
    gridSettings: GridSettings;
    expandedPanelId?: string;
    accessMode: GridAccessMode;
}) => {
    gridLayoutStateManager: GridLayoutStateManager;
    setDimensionsRef: (instance: HTMLDivElement | null) => void;
};
