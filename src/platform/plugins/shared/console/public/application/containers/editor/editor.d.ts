import React from 'react';
interface Props {
    loading: boolean;
    inputEditorValue: string;
    setInputEditorValue: (value: string) => void;
}
export declare const Editor: React.MemoExoticComponent<({ loading, inputEditorValue, setInputEditorValue }: Props) => React.JSX.Element | null>;
export {};
