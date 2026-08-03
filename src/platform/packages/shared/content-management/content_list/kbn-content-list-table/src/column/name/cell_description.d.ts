import React from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
export interface NameCellDescriptionProps {
    item: ContentListItem;
}
export declare const NameCellDescription: ({ item }: NameCellDescriptionProps) => React.JSX.Element | null;
