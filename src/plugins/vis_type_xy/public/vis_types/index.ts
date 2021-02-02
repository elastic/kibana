/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getAreaVisTypeDefinition } from './area';
import { getLineVisTypeDefinition } from './line';
import { getHistogramVisTypeDefinition } from './histogram';
import { getHorizontalBarVisTypeDefinition } from './horizontal_bar';
import { XyVisTypeDefinition } from '../types';

export const visTypesDefinitions = [
  getAreaVisTypeDefinition(true),
  getLineVisTypeDefinition(true),
  getHistogramVisTypeDefinition(true),
  getHorizontalBarVisTypeDefinition(true),
];

// TODO: Remove when vis_type_vislib is removed
// https://github.com/elastic/kibana/issues/56143
export const xyVisTypes: Record<
  string,
  (showElasticChartsOptions?: boolean) => XyVisTypeDefinition
> = {
  area: getAreaVisTypeDefinition,
  line: getLineVisTypeDefinition,
  histogram: getHistogramVisTypeDefinition,
  horizontalBar: getHorizontalBarVisTypeDefinition,
};
