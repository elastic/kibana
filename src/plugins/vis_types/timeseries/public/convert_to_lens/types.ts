/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/data-plugin/common';
import { NavigateToLensContext } from '@kbn/visualizations-plugin/public';
import type { Panel } from '../../common/types';

export type ConvertTsvbToLensVisualization = (
  model: Panel,
  timeRange?: TimeRange
) => Promise<NavigateToLensContext | null>;

export interface Filter {
  kql?: string | { [key: string]: any } | undefined;
  lucene?: string | { [key: string]: any } | undefined;
}
