import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EventEmitter } from 'events';
/**
 * Tries to find best position for opening context menu using mousemove and click event
 * Returned position is relative to document
 */
export declare function createInteractionPositionTracker(): {
    resolveLastPosition: () => {
        x: number;
        y: number;
    };
};
/**
 * A FlyoutSession describes the session of one opened flyout panel. It offers
 * methods to close the flyout panel again. If you open a flyout panel you should make
 * sure you call {@link ContextMenuSession#close} when it should be closed.
 * Since a flyout could also be closed without calling this method (e.g. because
 * the user closes it), you must listen to the "closed" event on this instance.
 * It will be emitted whenever the flyout will be closed and you should throw
 * away your reference to this instance whenever you receive that event.
 * @extends EventEmitter
 */
declare class ContextMenuSession extends EventEmitter {
    /**
     * Closes the opened flyout as long as it's still the open one.
     * If this is not the active session, this method will do nothing.
     * If this session was still active and a flyout was closed, the 'closed'
     * event will be emitted on this FlyoutSession instance.
     */
    close(): void;
}
/**
 * Opens a flyout panel with the given component inside. You can use
 * {@link ContextMenuSession#close} on the return value to close the flyout.
 *
 * @param flyoutChildren - Mounts the children inside a fly out panel
 * @return {FlyoutSession} The session instance for the opened flyout panel.
 */
export declare function openContextMenu(panels: EuiContextMenuPanelDescriptor[], props?: {
    closeButtonAriaLabel?: string;
    onClose?: () => void;
    'data-test-subj'?: string;
}): ContextMenuSession;
export { ContextMenuSession };
