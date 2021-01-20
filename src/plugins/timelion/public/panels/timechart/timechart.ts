/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { timechartFn } from './schema';
import { Panel } from '../panel';
import { TimelionVisualizationDependencies } from '../../application';

export function getTimeChart(dependencies: TimelionVisualizationDependencies) {
  // Schema is broken out so that it may be extended for use in other plugins
  // Its also easier to test.
  return new Panel('timechart', timechartFn(dependencies)());
}
