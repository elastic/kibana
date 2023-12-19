/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { metricFunction } from '../common';

interface SetupDeps {
  expressions: ExpressionsServerSetup;
}

export type ExpressionMetricPluginSetup = void;
export type ExpressionMetricPluginStart = void;

export class ExpressionMetricPlugin
  implements Plugin<ExpressionMetricPluginSetup, ExpressionMetricPluginStart, SetupDeps, {}>
{
  public setup(_core: CoreSetup, { expressions }: SetupDeps): ExpressionMetricPluginSetup {
    expressions.registerFunction(metricFunction);
  }

  public start(_core: CoreStart): ExpressionMetricPluginStart {}

  public stop() {}
}
