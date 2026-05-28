import * as React from 'react';
import { monaco, type CodeEditorProps } from '@kbn/code-editor';
export interface UrlTemplateEditorVariable {
    label: string;
    title?: string;
    documentation?: string;
    kind?: monaco.languages.CompletionItemKind;
    sortText?: string;
}
export interface UrlTemplateEditorProps {
    value: string;
    height?: CodeEditorProps['height'];
    fitToContent?: CodeEditorProps['fitToContent'];
    variables?: UrlTemplateEditorVariable[];
    onChange: CodeEditorProps['onChange'];
    onEditor?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    placeholder?: string;
    Editor?: React.ComponentType<CodeEditorProps>;
}
export declare const UrlTemplateEditor: React.FC<UrlTemplateEditorProps>;
