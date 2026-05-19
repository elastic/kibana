import React from 'react';
interface Props {
    selectedCsatOptionId: string;
    appTitle: string;
    handleChangeCsatOptionId: (optionId: string) => void;
}
export declare const CsatButtons: ({ selectedCsatOptionId, appTitle, handleChangeCsatOptionId, }: Props) => React.JSX.Element;
export {};
