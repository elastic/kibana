/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigateToLensContext, XYConfiguration } from '@kbn/visualizations-plugin/common';
import { TimeRange } from '@kbn/data-plugin/common';
import type { Panel } from '../../common/types';

export type ConvertTsvbToLensVisualization = (
  model: Panel,
  timeRange?: TimeRange
) => Promise<NavigateToLensContext<XYConfiguration> | null>;

export interface Filter {
  kql?: string | { [key: string]: any } | undefined;
  lucene?: string | { [key: string]: any } | undefined;
}

export interface AdditionalArgs {
  reducedTimeRange?: string;
  timeShift?: string;
}
