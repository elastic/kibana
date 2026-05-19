interface HandleEventPropagationOptions {
    event: MouseEvent;
    callback: (e: MouseEvent) => void;
}
/**
 * Handles event propagation for inspected HTML elements.
 * Prevents triggering 'onClick' behavior.
 * Allows for inspecting disabled HTML elements.
 */
export declare const handleEventPropagation: ({ event, callback, }: HandleEventPropagationOptions) => void;
export {};
