import React from 'react';
interface SyntaxExample {
    label: string;
    example: string;
}
export interface SyntaxExamples {
    title: string;
    footer: React.ReactElement;
    items: SyntaxExample[];
}
export interface SyntaxSuggestionsPopoverProps {
    meta: SyntaxExamples;
}
export declare const SyntaxSuggestionsPopover: React.FC<SyntaxSuggestionsPopoverProps>;
export {};
