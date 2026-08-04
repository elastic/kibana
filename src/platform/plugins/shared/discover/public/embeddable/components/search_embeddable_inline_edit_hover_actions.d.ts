import type { BehaviorSubject } from 'rxjs';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import React from 'react';
interface SearchEmbeddableInlineEditHoverActionsProps {
    draftSelectedTabId$: BehaviorSubject<string | undefined>;
    onEditInDiscover: () => Promise<void>;
    onSelectTab: (tabId: string) => Promise<void>;
    tabs: DiscoverSessionTab[];
}
export declare const SearchEmbeddableInlineEditHoverActions: ({ draftSelectedTabId$, onEditInDiscover, onSelectTab, tabs, }: SearchEmbeddableInlineEditHoverActionsProps) => React.JSX.Element;
export {};
