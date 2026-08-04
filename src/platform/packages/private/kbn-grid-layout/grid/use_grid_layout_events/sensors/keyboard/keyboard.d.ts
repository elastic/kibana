import type { UserInteractionEvent } from '../../types';
import type { UserKeyboardEvent } from './types';
type EventHandler = (e: UserInteractionEvent) => void;
export declare const startKeyboardInteraction: ({ e, onStart, onMove, onEnd, onCancel, onBlur, }: {
    e: UserKeyboardEvent;
    onMove: EventHandler;
    onStart: EventHandler;
    onEnd: EventHandler;
    onCancel: EventHandler;
    onBlur?: EventHandler;
}) => void;
export {};
