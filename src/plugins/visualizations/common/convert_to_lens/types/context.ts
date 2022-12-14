/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column } from './columns';
import { Configuration } from './configurations';

export interface Layer {
  indexPatternId: string;
  layerId: string;
  columns: Column[];
  columnOrder: string[];
}

export interface NavigateToLensContext<T extends Configuration = Configuration> {
  layers: Layer[];
  type: string;
  configuration: T;
  indexPatternIds: string[];
}
