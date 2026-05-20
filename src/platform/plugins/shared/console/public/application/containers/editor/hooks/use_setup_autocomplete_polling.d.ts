import type { AutocompleteInfo, Settings } from '../../../../services';
interface SetupAutocompletePollingParams {
    /** The Console autocomplete service. */
    autocompleteInfo: AutocompleteInfo;
    /** The Console settings service. */
    settingsService: Settings;
}
/**
 * Hook that sets up the autocomplete polling for Console editor.
 *
 * @param params The {@link SetupAutocompletePollingParams} to use.
 */
export declare const useSetupAutocompletePolling: (params: SetupAutocompletePollingParams) => void;
export {};
