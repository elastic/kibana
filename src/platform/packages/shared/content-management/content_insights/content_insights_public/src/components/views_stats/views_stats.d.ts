import React from 'react';
import type { ContentInsightsStats } from '@kbn/content-management-content-insights-server';
import type { Item } from '../../types';
export declare const ViewsStats: ({ item }: {
    item: Item;
}) => React.JSX.Element;
export declare function getTotalDays(stats: ContentInsightsStats): number;
export declare function getChartData(stats: ContentInsightsStats): Array<[week: number, views: number]>;
