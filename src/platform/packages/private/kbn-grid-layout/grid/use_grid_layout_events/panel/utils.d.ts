import type { ActivePanelEvent, GridPanelData } from '../../grid_panel';
import type { GridLayoutStateManager, RuntimeGridSettings } from '../../types';
import { type UserKeyboardEvent } from '../sensors/keyboard/types';
import type { PointerPosition, UserInteractionEvent } from '../types';
export declare const getDefaultResizeOptions: (runtimeSettings: RuntimeGridSettings) => {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
};
export declare const getRowCountInPixels: ({ rowCount, runtimeSettings, }: {
    rowCount: number;
    runtimeSettings: RuntimeGridSettings;
}) => number;
export declare const getResizePreviewRect: ({ activePanel, pointerPixel, runtimeSettings, resizeOptions, maxRight, }: {
    pointerPixel: PointerPosition;
    activePanel: ActivePanelEvent;
    runtimeSettings: RuntimeGridSettings;
    resizeOptions: GridPanelData["resizeOptions"];
    maxRight: number;
}) => {
    left: number;
    top: number;
    bottom: number;
    right: number;
};
export declare const getDragPreviewRect: ({ pointerPixel, activePanel, }: {
    pointerPixel: PointerPosition;
    activePanel: ActivePanelEvent;
}) => {
    left: number;
    top: number;
    bottom: number;
    right: number;
};
export declare function getSensorOffsets(e: UserInteractionEvent, { top, left, right, bottom }: DOMRect): {
    top: number;
    left: number;
    right: number;
    bottom: number;
};
export declare const getNextKeyboardPositionForPanel: (ev: UserKeyboardEvent, gridLayoutStateManager: GridLayoutStateManager, handlePosition: {
    clientX: number;
    clientY: number;
}) => {
    clientX: number;
    clientY: number;
};
