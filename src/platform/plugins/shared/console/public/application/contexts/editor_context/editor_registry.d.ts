import type { MonacoEditorActionsProvider } from '../../containers/editor/monaco_editor_actions_provider';
export declare class EditorRegistry {
    private inputEditor;
    setInputEditor(inputEditor: MonacoEditorActionsProvider): void;
    getInputEditor(): MonacoEditorActionsProvider;
}
export declare const instance: EditorRegistry;
