import type { UserInteractionEvent } from '../types';
export { isMouseEvent, startMouseInteraction } from './mouse';
export { isTouchEvent, startTouchInteraction } from './touch';
export { isKeyboardEvent, startKeyboardInteraction } from './keyboard';
export declare function getSensorPosition(e: UserInteractionEvent): {
    clientX: number;
    clientY: number;
};
export declare function getSensorType(e: UserInteractionEvent): "touch" | "mouse" | "keyboard";
