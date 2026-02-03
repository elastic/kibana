/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { PartitionVisParams } from '@kbn/expression-partition-vis-plugin/common';
import type {
  NavigateToLensContext,
  LensPartitionVisualizationState as PartitionVisConfiguration,
} from '@kbn/lens-common';
import type { Vis } from '@kbn/visualizations-plugin/public';

export type ConvertPieToLensVisualization = (
  vis: Vis<PartitionVisParams>,
  timefilter?: TimefilterContract
) => Promise<NavigateToLensContext<PartitionVisConfiguration> | null>;
