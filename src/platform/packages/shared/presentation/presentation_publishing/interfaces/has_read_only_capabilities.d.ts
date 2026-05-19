import type { HasTypeDisplayName } from './has_type';
/**
 * An interface which determines whether or not a given API offers to show the config for read only permissions.
 * In order to be read only, the api requires a show config function to execute the action
 * a getTypeDisplayName function to display to the user which type of chart is being
 * shown, and an isReadOnlyEnabled function.
 */
export interface HasReadOnlyCapabilities extends HasTypeDisplayName {
    onShowConfig: () => Promise<void>;
    isReadOnlyEnabled: () => {
        read: boolean;
        write: boolean;
    };
}
/**
 * A type guard which determines whether or not a given API is editable.
 */
export declare const hasReadOnlyCapabilities: (root: unknown) => root is HasReadOnlyCapabilities;
