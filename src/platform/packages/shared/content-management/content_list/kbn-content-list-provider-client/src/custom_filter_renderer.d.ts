import React, { type ReactNode } from 'react';
import { type Query } from '@elastic/eui';
import type { ResolvedContentListFilter } from './filters';
/** A single option surfaced to {@link CustomFilterRendererProps.renderOptionContent}. */
export interface CustomFilterOption {
    /** Stored filter value (the KQL value, also the facet-count key). */
    value: string;
    /** Display label. */
    label: string;
    /** Item count for this value. */
    count: number;
}
export interface CustomFilterRendererProps {
    query?: Query;
    onChange?: (query: Query) => void;
    filterDefinition: ResolvedContentListFilter;
    /**
     * Renders the content of a single option, inside the standard count-badge
     * row. Defaults to the option label as plain text. Supply this to add an
     * icon, color, avatar, etc. — the same extension point the built-in tag and
     * created-by filters use.
     */
    renderOptionContent?: (option: CustomFilterOption, state: {
        isActive: boolean;
    }) => ReactNode;
    'data-test-subj'?: string;
}
export declare const CustomFilterRenderer: ({ query, onChange, filterDefinition, renderOptionContent, "data-test-subj": dataTestSubj, }: CustomFilterRendererProps) => React.JSX.Element;
