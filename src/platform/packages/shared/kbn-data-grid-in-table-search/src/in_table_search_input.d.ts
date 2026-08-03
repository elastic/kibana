import React from 'react';
export interface InTableSearchInputProps {
    initialInTableSearchTerm?: string;
    matchesCount: number | null;
    activeMatchPosition: number | null;
    isProcessing: boolean;
    goToPrevMatch: () => void;
    goToNextMatch: () => void;
    onChangeSearchTerm: (searchTerm: string) => void;
    onHideInput: (shouldReturnFocusToButton?: boolean) => void;
}
export declare const InTableSearchInput: React.FC<InTableSearchInputProps>;
