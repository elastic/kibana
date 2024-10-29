/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Column } from './columns';
import { Configuration } from './configurations';

export interface Layer {
  indexPatternId: string;
  layerId: string;
  columns: Column[];
  columnOrder: string[];
  ignoreGlobalFilters: boolean;
}

export interface NavigateToLensContext<T extends Configuration = Configuration> {
  layers: Layer[];
  type: string;
  configuration: T;
  indexPatternIds: string[];
}
