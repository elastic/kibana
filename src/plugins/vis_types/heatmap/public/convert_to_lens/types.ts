/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimefilterContract } from '@kbn/data-plugin/public';
import { NavigateToLensContext, HeatmapConfiguration } from '@kbn/visualizations-plugin/common';
import { Vis } from '@kbn/visualizations-plugin/public';
import { HeatmapVisParams } from '../types';

export type ConvertHeatmapToLensVisualization = (
  vis: Vis<HeatmapVisParams>,
  timefilter?: TimefilterContract
) => Promise<NavigateToLensContext<HeatmapConfiguration> | null>;
