import type { CSSProperties, Dispatch } from 'react';
import type { ConsoleParsedRequestsProvider } from '@kbn/monaco';
import type { monaco } from '@kbn/monaco';
import type { Actions } from '../../stores/request';
import { type RequestToRestore } from '../../../types';
import type { ContextValue } from '../../contexts';
export declare class MonacoEditorActionsProvider {
    private editor;
    private setEditorActionsCss;
    private highlightedLinesClassName;
    private parsedRequestsProvider;
    private highlightedLines;
    constructor(editor: monaco.editor.IStandaloneCodeEditor, setEditorActionsCss: (css: CSSProperties) => void, highlightedLinesClassName: string, customParsedRequestsProvider?: ConsoleParsedRequestsProvider);
    private clearEditorDecorations;
    private updateEditorActions;
    private highlightRequests;
    private getSelectedParsedRequests;
    private getRequestsBetweenLines;
    private getErrorsBetweenLines;
    getRequests(): Promise<import("./types").EditorRequest[]>;
    getCurl(elasticsearchBaseUrl: string): Promise<string>;
    sendRequests(dispatch: Dispatch<Actions>, context: ContextValue): Promise<void>;
    getDocumentationLink(docLinkVersion: string): Promise<string | null>;
    private isInsideMultilineComment;
    private isPositionInsideComment;
    private getAutocompleteType;
    private getSuggestions;
    provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext): Promise<monaco.languages.CompletionList>;
    restoreRequestFromHistory(request: string): Promise<void>;
    private getTextInRange;
    /**
     * This function applies indentations to the request in the selected text.
     */
    autoIndent(context: ContextValue): Promise<void>;
    /**
     * This function moves the cursor to the previous request edge (start/end line).
     * If the cursor is inside a request, it is moved to the start line of this request.
     * If there are no requests before the cursor, it is moved at the first line in the editor.
     */
    moveToPreviousRequestEdge(): Promise<void>;
    /**
     * This function moves the cursor to the next request edge.
     * If the cursor is inside a request, it is moved to the end line of this request.
     * If there are no requests after the cursor, it is moved at the last line in the editor.
     */
    moveToNextRequestEdge(): Promise<void>;
    getLines(startLine: number, endLine: number): string[];
    getCurrentPosition(): monaco.IPosition;
    private isPositionInsideTripleQuotesAndQuery;
    private triggerSuggestions;
    importRequestsToEditor(requestsToImport: string): Promise<void>;
    appendRequestToEditor(req: RequestToRestore, dispatch?: Dispatch<Actions>, context?: ContextValue): Promise<void>;
    isKbnRequestSelected(): Promise<boolean>;
}
