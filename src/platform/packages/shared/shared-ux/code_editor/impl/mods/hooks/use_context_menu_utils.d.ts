import type { monaco } from '@kbn/monaco';
interface RegisterContextMenuActionsParams {
    editor: monaco.editor.IStandaloneCodeEditor;
    enableWriteActions: boolean;
    customActions?: ContextMenuAction[];
}
export interface ContextMenuAction {
    actionDescriptor: monaco.editor.IActionDescriptor;
    writeAction: boolean;
}
/**
 * Hook that returns a function for registering context menu actions in the Monaco editor.
 */
export declare const useContextMenuUtils: () => {
    registerContextMenuActions: ({ editor, enableWriteActions, customActions, }: RegisterContextMenuActionsParams) => void;
    unregisterContextMenuActions: () => void;
};
export {};
