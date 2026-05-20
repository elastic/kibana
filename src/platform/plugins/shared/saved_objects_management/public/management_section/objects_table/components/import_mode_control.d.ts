import React from 'react';
export interface ImportModeControlProps {
    initialValues: ImportMode;
    updateSelection: (result: ImportMode) => void;
}
export interface ImportMode {
    createNewCopies: boolean;
    overwrite: boolean;
}
export declare const ImportModeControl: ({ initialValues, updateSelection }: ImportModeControlProps) => React.JSX.Element;
