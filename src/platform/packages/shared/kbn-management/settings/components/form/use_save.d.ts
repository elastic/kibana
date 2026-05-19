import type { UnsavedFieldChanges } from '@kbn/management-settings-types';
export interface UseSaveParameters {
    /** The function to invoke for clearing all unsaved changes. */
    clearChanges: () => void;
}
/**
 * Hook to provide a function that will save all given {@link UnsavedFieldChange}.
 *
 * @param params The {@link UseSaveParameters} to use.
 * @returns A function that will save all {@link UnsavedFieldChange} that are passed as an argument.
 */
export declare const useSave: ({ clearChanges }: UseSaveParameters) => (changes: UnsavedFieldChanges) => Promise<void>;
