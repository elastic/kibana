import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
export declare const getNewSearchAppMenuItem: ({ onNewSearch, newSearchUrl, }: {
    onNewSearch: () => void;
    newSearchUrl?: string;
}) => DiscoverAppMenuItemType;
