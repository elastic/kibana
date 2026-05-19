import type { ESQLCallbacks, ESQLTelemetryCallbacks } from '@kbn/esql-types';
import { type MonacoMessage, type monaco } from '@kbn/code-editor';
import type { EsqlLanguageDeps } from '../types';
interface UseEditorConfigParams {
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
    editorModelUriRef: React.MutableRefObject<string | undefined>;
    editorCommandDisposables: React.MutableRefObject<WeakMap<monaco.editor.IStandaloneCodeEditor, monaco.IDisposable[]>>;
    esqlCallbacks: ESQLCallbacks;
    telemetryCallbacks: ESQLTelemetryCallbacks;
    isDisabled: boolean | undefined;
    measuredEditorWidth: number;
    setMeasuredEditorWidth: (width: number) => void;
    resetPendingTracking: () => void;
    editorMessagesRef: React.MutableRefObject<{
        errors: MonacoMessage[];
        warnings: MonacoMessage[];
    }>;
}
export declare const useEditorConfig: ({ editorRef, editorModel, editorModelUriRef, editorCommandDisposables, esqlCallbacks, telemetryCallbacks, isDisabled, measuredEditorWidth, setMeasuredEditorWidth, resetPendingTracking, editorMessagesRef, }: UseEditorConfigParams) => {
    esqlDepsByModelUri: Map<string, EsqlLanguageDeps>;
    suggestionProvider: monaco.languages.CompletionItemProvider;
    codeActionsProvider: monaco.languages.CodeActionProvider | undefined;
    codeEditorHoverProvider: {
        provideHover: (model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken) => monaco.languages.Hover | monaco.Thenable<monaco.languages.Hover | null | undefined>;
    };
    signatureProvider: monaco.languages.SignatureHelpProvider | undefined;
    inlineCompletionsProvider: monaco.languages.InlineCompletionsProvider<monaco.languages.InlineCompletions<monaco.languages.InlineCompletion>> | undefined;
    documentHighlightProvider: monaco.languages.DocumentHighlightProvider | undefined;
    onErrorClick: ({ startLineNumber, startColumn }: MonacoMessage) => void;
    codeEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions;
    onLayoutChangeRef: import("react").MutableRefObject<(layoutInfoEvent: monaco.editor.EditorLayoutInfo) => void>;
};
export {};
