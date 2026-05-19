import React from 'react';
import type { InlineEditing } from './saved_search_grid';
interface SearchEmbeddableDeletedTabPromptProps {
    api: {
        parentApi?: unknown;
    };
    canShowDashboardWriteControls: boolean;
    inlineEditing: InlineEditing;
}
export declare const SearchEmbeddableDeletedTabPrompt: ({ api, canShowDashboardWriteControls, inlineEditing, }: SearchEmbeddableDeletedTabPromptProps) => React.JSX.Element;
export {};
