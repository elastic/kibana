import React from 'react';
export interface EditorProps {
    localStorageValue: string | undefined;
    value: string;
    setValue: (value: string) => void;
    customParsedRequestsProvider?: (model: any) => any;
}
export declare const MonacoEditor: ({ localStorageValue, value, setValue, customParsedRequestsProvider, }: EditorProps) => React.JSX.Element;
