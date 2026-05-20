import { EventEmitter } from 'events';
/**
 *  ResizeChecker receives an element and emits a "resize" event every time it changes size.
 */
export declare class ResizeChecker extends EventEmitter {
    private destroyed;
    private el;
    private observer;
    private expectedSize;
    constructor(el: HTMLElement, args?: {
        disabled?: boolean;
    });
    enable(): void;
    /**
     *  Run a function and ignore all resizes that occur
     *  while it's running.
     */
    modifySizeWithoutTriggeringResize(block: () => void): void;
    /**
     * Tell the ResizeChecker to shutdown, stop listenings, and never
     * emit another resize event.
     *
     * Cleans up it's listeners and timers.
     */
    destroy(): void;
}
