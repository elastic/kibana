/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { ExpressionXyPluginSetup, ExpressionXyPluginStart, SetupDeps } from './types';
import {
  xyChartFunction,
  yAxisConfigFunction,
  legendConfigFunction,
  gridlinesConfigFunction,
  dataLayerConfigFunction,
  axisExtentConfigFunction,
  tickLabelsConfigFunction,
  labelsOrientationConfigFunction,
  referenceLineLayerConfigFunction,
  axisTitlesVisibilityConfigFunction,
} from '../common';

export class ExpressionXyPlugin
  implements Plugin<ExpressionXyPluginSetup, ExpressionXyPluginStart>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionXyPluginSetup {
    expressions.registerFunction(yAxisConfigFunction);
    expressions.registerFunction(legendConfigFunction);
    expressions.registerFunction(gridlinesConfigFunction);
    expressions.registerFunction(dataLayerConfigFunction);
    expressions.registerFunction(axisExtentConfigFunction);
    expressions.registerFunction(tickLabelsConfigFunction);
    expressions.registerFunction(labelsOrientationConfigFunction);
    expressions.registerFunction(referenceLineLayerConfigFunction);
    expressions.registerFunction(axisTitlesVisibilityConfigFunction);
    expressions.registerFunction(xyChartFunction);
  }

  public start(core: CoreStart): ExpressionXyPluginStart {}

  public stop() {}
}
