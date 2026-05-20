import React from 'react';
import type { QuerySuggestion } from '../../autocomplete';
import type { SuggestionOnClick, SuggestionOnMouseEnter } from './types';
interface Props {
    onClick: SuggestionOnClick;
    onMouseEnter: SuggestionOnMouseEnter;
    selected: boolean;
    index: number;
    suggestion: QuerySuggestion;
    innerRef: (index: number, node: HTMLDivElement) => void;
    ariaId: string;
    shouldDisplayDescription: boolean;
}
export declare const SuggestionComponent: React.NamedExoticComponent<Props>;
export {};
