import type { GridLayoutStateManager } from '../../types';
import type { UserKeyboardEvent } from '../sensors/keyboard/types';
export declare const getNextKeyboardPosition: (ev: UserKeyboardEvent, gridLayoutStateManager: GridLayoutStateManager, handlePosition: {
    clientX: number;
    clientY: number;
}, sectionId: string) => {
    clientX: number;
    clientY: number;
};
