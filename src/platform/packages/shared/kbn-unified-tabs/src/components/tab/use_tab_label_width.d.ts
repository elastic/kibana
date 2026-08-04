import type { CSSProperties } from 'react';
import type { TabItem, TabsSizeConfig } from '../../types';
export declare const useTabLabelWidth: ({ item, tabsSizeConfig, fontWeight, }: {
    item: TabItem;
    tabsSizeConfig: TabsSizeConfig;
    fontWeight: CSSProperties["fontWeight"];
}) => {
    tabLabelRef: import("react").MutableRefObject<HTMLDivElement | null>;
    tabLabelWidth: number;
    tabLabelTextWidth: number;
};
