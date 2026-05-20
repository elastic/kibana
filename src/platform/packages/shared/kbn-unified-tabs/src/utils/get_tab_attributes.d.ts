import type { TabItem } from '../types';
export declare const getTabIdAttribute: (item: TabItem) => string;
export declare const getTabAttributes: (item: TabItem, tabContentId: string) => {
    id: string;
    'aria-controls': string;
};
