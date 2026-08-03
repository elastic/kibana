import type { PublishingSubject } from '../publishing_subject';
export type ViewMode = 'view' | 'edit' | 'print' | 'preview';
/**
 * This API publishes a universal view mode which can change compatibility of actions and the
 * visibility of components.
 */
export interface PublishesViewMode {
    viewMode$: PublishingSubject<ViewMode>;
}
/**
 * This API publishes a writable universal view mode which can change compatibility of actions and the
 * visibility of components.
 */
export type PublishesWritableViewMode = PublishesViewMode & {
    setViewMode: (viewMode: ViewMode) => void;
};
/**
 * A type guard which can be used to determine if a given API publishes a view mode.
 */
export declare const apiPublishesViewMode: (unknownApi: null | unknown) => unknownApi is PublishesViewMode;
export declare const apiPublishesWritableViewMode: (unknownApi: null | unknown) => unknownApi is PublishesWritableViewMode;
