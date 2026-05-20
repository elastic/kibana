import type { GridLayoutStateManager } from './types';
export interface GridLayoutContextType<UseCustomDragHandle extends boolean = boolean> {
    gridLayoutStateManager: GridLayoutStateManager;
    useCustomDragHandle: UseCustomDragHandle;
    renderPanelContents: (panelId: string, setDragHandles: UseCustomDragHandle extends true ? (refs: Array<HTMLElement | null>) => void : undefined) => React.ReactNode;
}
export declare const GridLayoutContext: import("react").Context<GridLayoutContextType<boolean> | undefined>;
export declare const useGridLayoutContext: () => GridLayoutContextType;
