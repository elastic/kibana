import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { type SearchResponseWarning } from '@kbn/search-response-warnings';
import type { InlineEditing } from './saved_search_grid';
export interface SavedSearchEmbeddableBaseProps {
    isLoading: boolean;
    totalHitCount?: number;
    prepend?: React.ReactElement;
    append?: React.ReactElement;
    interceptedWarnings?: SearchResponseWarning[];
    inlineEditing?: InlineEditing;
}
export declare const SavedSearchEmbeddableBase: FC<PropsWithChildren<SavedSearchEmbeddableBaseProps>>;
