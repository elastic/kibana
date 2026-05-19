import type { Observable } from 'rxjs';
import type { UseEuiTheme } from '@elastic/eui';
import type { monaco } from './monaco_imports';
export interface LangModuleType {
    ID: string;
    lexerRules?: monaco.languages.IMonarchLanguage;
    languageConfiguration?: monaco.languages.LanguageConfiguration;
    foldingRangeProvider?: monaco.languages.FoldingRangeProvider;
    getSuggestionProvider?: Function;
    onLanguage?: () => void | Promise<void>;
    languageThemeResolver?: (args: UseEuiTheme) => monaco.editor.IStandaloneThemeData;
}
export interface CompleteLangModuleType extends LangModuleType {
    languageConfiguration: monaco.languages.LanguageConfiguration;
    getSuggestionProvider: Function;
    getSyntaxErrors: Function;
    validation$: () => Observable<LangValidation>;
}
interface LanguageProvidersModule<Deps = unknown, MarkerDataType = monaco.editor.IMarkerData> {
    validate: (model: monaco.editor.ITextModel, code: string, callbacks?: Deps, options?: {
        invalidateColumnsCache?: boolean;
    }) => Promise<{
        errors: MarkerDataType[];
        warnings: MarkerDataType[];
    }>;
    getSuggestionProvider: (callbacks?: Deps) => monaco.languages.CompletionItemProvider;
    getSignatureProvider?: (callbacks?: Deps) => monaco.languages.SignatureHelpProvider;
    getHoverProvider?: (callbacks?: Deps) => monaco.languages.HoverProvider;
    getInlineCompletionsProvider?: (callbacks?: Deps) => monaco.languages.InlineCompletionsProvider;
    getCodeActionProvider?: (callbacks?: Deps) => monaco.languages.CodeActionProvider;
    getDocumentHighlightProvider?: (callbacks?: Deps) => monaco.languages.DocumentHighlightProvider;
}
export interface CustomLangModuleType<Deps = unknown, MarkerDataType = monaco.editor.IMarkerData> extends Omit<LangModuleType, 'getSuggestionProvider' | 'onLanguage'>, LanguageProvidersModule<Deps, MarkerDataType> {
    onLanguage: NonNullable<LangModuleType['onLanguage']>;
}
export interface MonacoEditorError {
    severity: monaco.MarkerSeverity;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
    code: string;
}
export interface LangValidation {
    isValidating: boolean;
    isValid: boolean;
    errors: MonacoEditorError[];
}
export interface SyntaxErrors {
    [modelId: string]: MonacoEditorError[];
}
export interface BaseWorkerDefinition {
    getSyntaxErrors: (modelUri: string) => Promise<MonacoEditorError[] | undefined>;
}
export {};
