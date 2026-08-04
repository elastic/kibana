import React from 'react';
import { type CodeEditorProps as KibanaReactCodeEditorProps } from '@kbn/code-editor';
type Props = Pick<KibanaReactCodeEditorProps, 'aria-label' | 'value' | 'onChange'>;
export interface CodeEditorProps extends Props {
    type: 'markdown' | 'json';
    isReadOnly: boolean;
    name: string;
}
export declare const CodeEditor: ({ onChange, type, isReadOnly, name, ...props }: CodeEditorProps) => React.JSX.Element;
export {};
