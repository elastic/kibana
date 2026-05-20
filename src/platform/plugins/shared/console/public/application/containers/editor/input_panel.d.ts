import React from 'react';
interface Props {
    loading: boolean;
    inputEditorValue: string;
    setInputEditorValue: (value: string) => void;
    setFetchingAutocompleteEntities: (value: boolean) => void;
}
export declare const InputPanel: ({ loading, inputEditorValue, setInputEditorValue, setFetchingAutocompleteEntities, }: Props) => React.JSX.Element;
export {};
