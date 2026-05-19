import type { OverlayRef } from '@kbn/core-mount-utils-browser';
/**
 * A SystemFlyoutRef is a reference to an opened system flyout panel.
 * It provides methods to close the flyout and integrates with the EUI Flyout Manager.
 */
export declare class SystemFlyoutRef implements OverlayRef {
    readonly onClose: Promise<void>;
    private _isClosed;
    private closeSubject;
    private container;
    constructor(container: HTMLElement);
    get isClosed(): boolean;
    close(): Promise<void>;
}
