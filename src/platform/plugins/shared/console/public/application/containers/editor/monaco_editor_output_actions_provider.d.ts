import type { CSSProperties } from 'react';
import { monaco } from '@kbn/monaco';
export declare class MonacoEditorOutputActionsProvider {
    private editor;
    private setEditorActionsCss;
    private highlightedLinesClassName;
    private highlightedLines;
    constructor(editor: monaco.editor.IStandaloneCodeEditor, setEditorActionsCss: (css: CSSProperties) => void, highlightedLinesClassName: string);
    private clearEditorDecorations;
    private updateEditorActions;
    private highlightRequests;
    private getSelectedParsedOutput;
    private getRequestsBetweenLines;
    selectFirstLine(): void;
    getParsedOutput(): Promise<string>;
}
