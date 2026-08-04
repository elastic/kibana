import React from 'react';
export interface JsonCodeEditorProps {
    json: Record<string, unknown>;
    width?: string | number;
    height?: string | number;
    hasLineNumbers?: boolean;
}
export default function JsonCodeEditor({ json, width, height, hasLineNumbers, }: JsonCodeEditorProps): React.JSX.Element;
