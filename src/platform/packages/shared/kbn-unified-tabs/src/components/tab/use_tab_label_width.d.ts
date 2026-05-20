import type { TabItem, TabsSizeConfig } from '../../types';
export declare const useTabLabelWidth: ({ item, tabsSizeConfig, }: {
    item: TabItem;
    tabsSizeConfig: TabsSizeConfig;
}) => {
    tabLabelRef: import("react").MutableRefObject<HTMLDivElement | null>;
    tabLabelWidth: number;
    tabLabelTextWidth: number;
};
