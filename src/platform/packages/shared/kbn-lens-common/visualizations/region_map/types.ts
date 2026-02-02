/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';

export interface ChoroplethChartState {
  layerId: string;
  emsLayerId?: string;
  emsField?: string;
  regionAccessor?: string;
  valueAccessor?: string;
}

export interface ChoroplethChartConfig extends ChoroplethChartState {
  title: string;
  description: string;
}

export interface ChoroplethChartProps {
  data: Datatable;
  args: ChoroplethChartConfig;
}
