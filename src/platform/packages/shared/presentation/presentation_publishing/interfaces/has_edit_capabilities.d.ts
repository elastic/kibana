import type { HasTypeDisplayName } from './has_type';
/**
 * An interface which determines whether or not a given API is editable.
 * In order to be editable, the api requires an edit function to execute the action
 * a getTypeDisplayName function to display to the user which type of chart is being
 * edited, and an isEditingEnabled function.
 */
export interface HasEditCapabilities extends HasTypeDisplayName {
    onEdit: ({ isNewPanel }?: {
        isNewPanel?: boolean;
    }) => Promise<void>;
    isEditingEnabled: () => boolean;
    getEditHref?: () => Promise<string | undefined>;
}
/**
 * A type guard which determines whether or not a given API is editable.
 */
export declare const hasEditCapabilities: (root: unknown) => root is HasEditCapabilities;
