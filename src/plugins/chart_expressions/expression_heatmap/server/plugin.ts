/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { ExpressionsServerStart, ExpressionsServerSetup } from '../../../expressions/server';
import { heatmapFunction, heatmapLegendConfig, heatmapGridConfig } from '../common';

interface SetupDeps {
  expressions: ExpressionsServerSetup;
}

interface StartDeps {
  expression: ExpressionsServerStart;
}

export type ExpressionHeatmapPluginSetup = void;
export type ExpressionHeatmapPluginStart = void;

export class ExpressionHeatmapPlugin
  implements
    Plugin<ExpressionHeatmapPluginSetup, ExpressionHeatmapPluginStart, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionHeatmapPluginSetup {
    expressions.registerFunction(heatmapFunction);
    expressions.registerFunction(heatmapLegendConfig);
    expressions.registerFunction(heatmapGridConfig);
  }

  public start(core: CoreStart): ExpressionHeatmapPluginStart {}

  public stop() {}
}
