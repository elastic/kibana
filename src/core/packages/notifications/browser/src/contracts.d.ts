import type { IToasts, NotificationCoordinator } from './types';
import type { FeedbackStart } from './feedback_types';
import type { ToursStart } from './tours_types';
/**
 * {@link IToasts}
 * @public
 */
export type ToastsSetup = IToasts;
/**
 * {@link IToasts}
 * @public
 */
export type ToastsStart = IToasts;
/** @public */
export interface NotificationsSetup {
    /** {@link ToastsSetup} */
    toasts: ToastsSetup;
    /**
     * {@link NotificationCoordinator}
     */
    coordinator: NotificationCoordinator;
}
/** @public */
export interface NotificationsStart {
    /** {@link ToastsStart} */
    toasts: ToastsStart;
    showErrorDialog: (options: {
        title: string;
        error: Error;
    }) => void;
    /**
     * Controls visibility of feedback elements
     * @public
     */
    feedback: FeedbackStart;
    /**
     * Controls visibility of guided tours
     * @public
     */
    tours: ToursStart;
}
