import React from 'react';
interface RightSideActionsProps {
    value: string;
    'data-test-subj'?: string;
    isFullscreen: boolean;
    onSearchTermChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}
export declare const SearchButton: ({ value, isFullscreen, "data-test-subj": dataTestSubj, onSearchTermChange, onKeyDown, }: RightSideActionsProps) => React.JSX.Element;
export {};
