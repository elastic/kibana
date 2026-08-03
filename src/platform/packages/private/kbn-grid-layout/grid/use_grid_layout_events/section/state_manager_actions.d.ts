import type { GridLayoutStateManager } from '../../types';
import type { PointerPosition, UserInteractionEvent } from '../types';
export declare const startAction: (e: UserInteractionEvent, gridLayoutStateManager: GridLayoutStateManager, sectionId: string) => void;
export declare const commitAction: ({ activeSectionEvent$, headerRefs }: GridLayoutStateManager) => void;
export declare const cancelAction: ({ activeSectionEvent$, gridLayout$, headerRefs, }: GridLayoutStateManager) => void;
export declare const moveAction: (gridLayoutStateManager: GridLayoutStateManager, startingPointer: PointerPosition, currentPointer: PointerPosition) => void;
