import React from 'react';
export interface JsonCodeEditorProps {
    json: Record<string, unknown>;
    width?: string | number;
    height?: string | number;
    hasLineNumbers?: boolean;
    enableFindAction?: boolean;
}
export default function JsonCodeEditor({ json, width, height, hasLineNumbers, enableFindAction, }: JsonCodeEditorProps): React.JSX.Element;
