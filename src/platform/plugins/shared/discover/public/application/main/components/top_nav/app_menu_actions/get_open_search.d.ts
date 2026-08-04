import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
export declare const getOpenSearchAppMenuItem: ({ onOpenSavedSearch, }: {
    onOpenSavedSearch: (savedSearchId: string) => void;
}) => DiscoverAppMenuItemType;
