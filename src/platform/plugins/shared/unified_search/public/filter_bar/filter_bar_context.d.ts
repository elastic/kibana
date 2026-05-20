import type { Filter } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import React from 'react';
export declare const FilterBarContextProvider: React.FC<React.PropsWithChildren<{
    filters?: Filter[];
    storage: IStorageWrapper;
}>>;
export declare const useFilterBarContext: () => {
    isCollapsible: boolean;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    expandablePillsId: string;
    numActiveFilters: number;
};
