import type { FieldValueOptionType, Query } from '@elastic/eui';
import type { Tag } from '../types';
export interface TagSelection {
    [tagId: string]: 'include' | 'exclude' | undefined;
}
export interface TagOptionItem extends FieldValueOptionType {
    label: string;
    checked?: 'on' | 'off';
    tag: Tag;
}
export interface Params {
    query: Query | null;
    tagsToTableItemMap: {
        [tagId: string]: string[];
    };
    getTagList: () => Tag[];
    addOrRemoveIncludeTagFilter: (tag: Tag) => void;
    addOrRemoveExcludeTagFilter: (tag: Tag) => void;
}
export declare const useTagFilterPanel: ({ query, tagsToTableItemMap, getTagList, addOrRemoveExcludeTagFilter, addOrRemoveIncludeTagFilter, }: Params) => {
    isPopoverOpen: boolean;
    options: TagOptionItem[];
    totalActiveFilters: number;
    onFilterButtonClick: () => void;
    onSelectChange: (updatedOptions: TagOptionItem[]) => void;
    closePopover: () => void;
};
