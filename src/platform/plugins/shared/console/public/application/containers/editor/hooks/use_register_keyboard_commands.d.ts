import type { monaco } from '@kbn/monaco';
interface RegisterKeyboardCommandsParams {
    /** The current Monaco editor instance. */
    editor: monaco.editor.IStandaloneCodeEditor;
    /** Function for sending the selected request(s). */
    sendRequest: () => void;
    /** Function for indenting the selected request(s). */
    autoIndent: () => void;
    /** Function that returns the documentation link for the selected request. */
    getDocumentationLink: () => Promise<string | null> | undefined;
    /** Function for moving the cursor to the previous request edge. */
    moveToPreviousRequestEdge: () => void;
    /** Function for moving the cursor to the next request edge. */
    moveToNextRequestEdge: () => void;
}
/**
 * Hook that returns a function for registering keyboard commands in the editor.
 *
 * @param params The {@link RegisterKeyboardCommandsParams} to use.
 */
export declare const useKeyboardCommandsUtils: () => {
    registerKeyboardCommands: (params: RegisterKeyboardCommandsParams) => void;
    unregisterKeyboardCommands: () => void;
};
export {};
