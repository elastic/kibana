import React from 'react';
import type { FC } from 'react';
import type { TagOptionItem } from './use_tag_filter_panel';
interface Context {
    clearTagSelection: () => void;
    closePopover: () => void;
    isPopoverOpen: boolean;
    options: TagOptionItem[];
    totalActiveFilters: number;
    onFilterButtonClick: () => void;
    onSelectChange: (updatedOptions: TagOptionItem[]) => void;
}
export declare const TagFilterContextProvider: FC<React.PropsWithChildren<Context>>;
export declare const TagFilterPanel: FC<{}>;
export {};
