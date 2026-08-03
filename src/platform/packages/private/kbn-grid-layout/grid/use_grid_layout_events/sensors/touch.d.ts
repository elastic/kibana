import type { UserInteractionEvent } from '../types';
export type UserTouchEvent = TouchEvent | React.TouchEvent<HTMLButtonElement>;
export declare const isTouchEvent: (e: Event | React.UIEvent<HTMLElement>) => e is UserTouchEvent;
export declare const getTouchSensorPosition: ({ touches }: UserTouchEvent) => {
    clientX: number;
    clientY: number;
};
export declare const startTouchInteraction: ({ e, onMove, onEnd, onStart, }: {
    e: UserTouchEvent;
    onStart: (e: UserInteractionEvent) => void;
    onMove: (e: UserInteractionEvent) => void;
    onEnd: () => void;
}) => void;
