/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenericIndexPatternColumn } from './datasources/types';
import type { LensConfiguration } from './visualizations/types';

// Need to duplicate this type here from the visualization plugin to avoid circular dependency
type ToBaseColumnFormat<Col extends GenericIndexPatternColumn> = {
  columnId: string;
  isSplit: boolean;
} & Omit<Col, 'label'> & { label?: string };

type LensColumn = ToBaseColumnFormat<GenericIndexPatternColumn> & {
  params?: Record<string, unknown>;
};

export interface NavigateToLensLayer {
  indexPatternId: string;
  layerId: string;
  columns: LensColumn[];
  columnOrder: string[];
  ignoreGlobalFilters: boolean;
}

export interface NavigateToLensContext<T extends LensConfiguration = LensConfiguration> {
  layers: NavigateToLensLayer[];
  type: string;
  configuration: T;
  indexPatternIds: string[];
}
