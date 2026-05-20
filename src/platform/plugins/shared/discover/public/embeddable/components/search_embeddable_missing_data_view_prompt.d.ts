import React from 'react';
import type { InlineEditing } from './saved_search_grid';
interface SearchEmbeddableMissingDataViewPromptProps {
    api: {
        parentApi?: unknown;
    };
    canShowDashboardWriteControls: boolean;
    inlineEditing: InlineEditing;
    isByReference: boolean;
    onEditInDiscover?: () => Promise<void>;
}
export declare const SearchEmbeddableMissingDataViewPrompt: ({ api, canShowDashboardWriteControls, inlineEditing, isByReference, onEditInDiscover, }: SearchEmbeddableMissingDataViewPromptProps) => React.JSX.Element;
export {};
