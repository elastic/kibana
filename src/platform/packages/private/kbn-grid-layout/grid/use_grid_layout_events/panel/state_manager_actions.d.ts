import type { MutableRefObject } from 'react';
import type { ActivePanelEvent, GridPanelData } from '../../grid_panel';
import type { GridLayoutStateManager } from '../../types';
import type { GridLayoutContextType } from '../../use_grid_layout_context';
import type { PointerPosition, UserInteractionEvent } from '../types';
export declare const startAction: (e: UserInteractionEvent, type: ActivePanelEvent["type"], gridLayoutStateManager: GridLayoutStateManager, sectionId: string, panelId: string) => void;
export declare const moveAction: (e: UserInteractionEvent, gridLayoutStateManager: GridLayoutContextType["gridLayoutStateManager"], pointerPixel: PointerPosition, lastRequestedPanelPosition: MutableRefObject<GridPanelData | undefined>) => void;
export declare const commitAction: ({ activePanelEvent$: activePanelEvent$, panelRefs, }: GridLayoutStateManager) => void;
export declare const cancelAction: ({ activePanelEvent$: activePanelEvent$, gridLayout$, panelRefs, }: GridLayoutStateManager) => void;
