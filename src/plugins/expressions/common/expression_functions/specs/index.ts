/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { clog } from './clog';
import { font } from './font';
import { variableSet } from './var_set';
import { variable } from './var';
import { AnyExpressionFunctionDefinition } from '../types';
import { theme } from './theme';
import { cumulativeSum } from './cumulative_sum';
import { derivative } from './derivative';
import { movingAverage } from './moving_average';

export const functionSpecs: AnyExpressionFunctionDefinition[] = [
  clog,
  font,
  variableSet,
  variable,
  theme,
  cumulativeSum,
  derivative,
  movingAverage,
];

export * from './clog';
export * from './font';
export * from './var_set';
export * from './var';
export * from './theme';
export * from './cumulative_sum';
export * from './derivative';
export * from './moving_average';
