import React from 'react';
export interface CompositeEditorProps {
    onReset: () => void;
    isDisabled?: boolean;
}
export declare const CompositeEditor: ({ onReset, isDisabled }: CompositeEditorProps) => React.JSX.Element;
