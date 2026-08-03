import type { UserKeyboardEvent } from './types';
export { startKeyboardInteraction } from './keyboard';
export declare const isKeyboardEvent: (e: Event | React.UIEvent<HTMLElement>) => e is UserKeyboardEvent;
export declare const getElementPosition: (target: EventTarget | null) => {
    clientX: number;
    clientY: number;
};
