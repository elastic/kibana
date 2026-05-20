import type { ScrollContainer } from '@kbn/core-chrome-layout-utils';
import type { UserInteractionEvent } from '../types';
export type UserMouseEvent = MouseEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>;
export declare const isMouseEvent: (e: Event | React.UIEvent<HTMLElement>) => e is UserMouseEvent;
export declare const getMouseSensorPosition: ({ clientX, clientY }: UserMouseEvent) => {
    clientX: number;
    clientY: number;
};
export declare const startMouseInteraction: ({ e, onStart, onMove, onEnd, scrollContainer, }: {
    e: UserMouseEvent;
    onStart: (e: UserInteractionEvent) => void;
    onMove: (e: UserInteractionEvent) => void;
    onEnd: () => void;
    scrollContainer: ScrollContainer;
}) => void;
