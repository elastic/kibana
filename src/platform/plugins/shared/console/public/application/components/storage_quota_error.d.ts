import React from 'react';
interface Props {
    onClearHistory: () => void;
    onDisableSavingToHistory: () => void;
}
export declare const StorageQuotaError: ({ onClearHistory, onDisableSavingToHistory }: Props) => React.JSX.Element;
export {};
