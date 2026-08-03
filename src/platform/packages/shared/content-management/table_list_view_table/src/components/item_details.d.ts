import React from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { Tag } from '../types';
import type { TableListViewTableProps } from '../table_list_view_table';
type InheritedProps<T extends UserContentCommonSchema> = Pick<TableListViewTableProps<T>, 'getOnClickTitle' | 'getDetailViewLink' | 'id'>;
interface Props<T extends UserContentCommonSchema> extends InheritedProps<T> {
    item: T;
    searchTerm?: string;
    onClickTag: (tag: Tag, isCtrlKey: boolean) => void;
    isFavoritesEnabled?: boolean;
}
export declare function ItemDetails<T extends UserContentCommonSchema>({ id, item, searchTerm, getDetailViewLink, getOnClickTitle, onClickTag, isFavoritesEnabled, }: Props<T>): React.JSX.Element;
export {};
