interface SetupAutosaveParams {
    /** The current input value in the Console editor. */
    value: string;
}
/**
 * Hook that sets up autosaving the Console editor input to localStorage.
 *
 * @param params The {@link SetupAutosaveParams} to use.
 */
export declare const useSetupAutosave: (params: SetupAutosaveParams) => void;
export {};
