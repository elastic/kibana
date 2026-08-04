import React from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
export interface NameCellTitleProps {
    item: ContentListItem;
    /**
     * Whether to use the provider-level `item.getHref` for the title link.
     * Defaults to `true` unless `onClick` is provided.
     */
    shouldUseHref?: boolean;
    /**
     * Optional click handler for the title. When provided, the provider-level
     * `item.getHref` is ignored unless `shouldUseHref` is explicitly `true`.
     */
    onClick?: (item: ContentListItem) => void;
}
export declare const NameCellTitle: ({ item, shouldUseHref, onClick }: NameCellTitleProps) => React.JSX.Element;
