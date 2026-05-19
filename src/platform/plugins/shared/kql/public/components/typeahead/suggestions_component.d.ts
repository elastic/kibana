import React, { PureComponent } from 'react';
import type { QuerySuggestion } from '../../autocomplete';
import type { SuggestionOnClick, SuggestionOnMouseEnter } from './types';
interface SuggestionsComponentProps {
    index: number | null;
    onClick: SuggestionOnClick;
    onMouseEnter: SuggestionOnMouseEnter;
    show: boolean;
    suggestions: QuerySuggestion[];
    loadMore: () => void;
    size?: SuggestionsListSize;
    inputContainer: HTMLElement | null;
}
export interface SuggestionsAbstraction {
    type: 'alerts' | 'rules' | 'cases' | 'endpoints' | 'action_policies';
    fields: Record<string, {
        field: string;
        fieldToQuery: string;
        displayField: string | undefined;
        nestedDisplayField?: string;
        nestedField?: string;
        nestedPath?: string;
    }>;
}
export type SuggestionsListSize = 's' | 'l';
export declare class SuggestionsComponent extends PureComponent<SuggestionsComponentProps> {
    private childNodes;
    private parentNode;
    constructor(props: SuggestionsComponentProps);
    private assignParentNode;
    private assignChildNode;
    render(): React.JSX.Element | null;
    componentDidUpdate(prevProps: SuggestionsComponentProps): void;
    private scrollIntoView;
    private handleScroll;
}
export {};
