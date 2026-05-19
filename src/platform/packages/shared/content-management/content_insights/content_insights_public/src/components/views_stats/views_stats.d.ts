/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ContentInsightsStats } from '@kbn/content-management-content-insights-server';
import type { Item } from '../../types';
export declare const ViewsStats: ({ item }: { item: Item }) => React.JSX.Element;
export declare function getTotalDays(stats: ContentInsightsStats): number;
export declare function getChartData(
  stats: ContentInsightsStats
): Array<[week: number, views: number]>;
