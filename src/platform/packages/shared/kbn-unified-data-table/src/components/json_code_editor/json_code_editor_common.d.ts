import React from 'react';
import type { monaco } from '@kbn/monaco';
interface JsonCodeEditorCommonProps {
    jsonValue: string;
    onEditorDidMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    width?: string | number;
    height?: string | number;
    hasLineNumbers?: boolean;
    hideCopyButton?: boolean;
}
export declare const JsonCodeEditorCommon: ({ jsonValue, width, height, hasLineNumbers, onEditorDidMount, hideCopyButton, }: JsonCodeEditorCommonProps) => React.JSX.Element | null;
export declare const JSONCodeEditorCommonMemoized: React.MemoExoticComponent<(props: JsonCodeEditorCommonProps) => React.JSX.Element>;
export {};
