import React from 'react';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { IUnifiedSearchPluginServices } from '../../types';
export interface PhraseSuggestorProps {
    kibana: KibanaReactContextValue<IUnifiedSearchPluginServices>;
    indexPattern: DataView;
    field: DataViewField;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export interface PhraseSuggestorState {
    suggestions: string[];
    isLoading: boolean;
}
/**
 * Since both "phrase" and "phrases" filter inputs suggest values (if enabled and the field is
 * aggregatable), we pull out the common logic for requesting suggestions into this component
 * which both of them extend.
 */
export declare class PhraseSuggestorUI<T extends PhraseSuggestorProps> extends React.Component<T, PhraseSuggestorState> {
    private services;
    private abortController?;
    state: PhraseSuggestorState;
    componentDidMount(): void;
    componentWillUnmount(): void;
    protected isSuggestingValues(): any;
    protected onSearchChange: (value: string | number | boolean) => void;
    protected updateSuggestions: import("lodash").DebouncedFunc<(query?: string) => Promise<void>>;
}
export declare const PhraseSuggestor: React.FC<Omit<{
    kibana: KibanaReactContextValue<{}>;
}, "kibana">>;
