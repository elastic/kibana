/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../../core/server';

import { ExpressionXyPluginSetup, ExpressionXyPluginStart } from './types';
import {
  xyVisFunction,
  yAxisConfigFunction,
  legendConfigFunction,
  gridlinesConfigFunction,
  dataLayerConfigFunction,
  axisExtentConfigFunction,
  tickLabelsConfigFunction,
  annotationLayerConfigFunction,
  labelsOrientationConfigFunction,
  referenceLineLayerConfigFunction,
  axisTitlesVisibilityConfigFunction,
} from '../common';
import { SetupDeps } from './types';

export class ExpressionXyPlugin
  implements Plugin<ExpressionXyPluginSetup, ExpressionXyPluginStart>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps) {
    expressions.registerFunction(yAxisConfigFunction);
    expressions.registerFunction(legendConfigFunction);
    expressions.registerFunction(gridlinesConfigFunction);
    expressions.registerFunction(dataLayerConfigFunction);
    expressions.registerFunction(axisExtentConfigFunction);
    expressions.registerFunction(tickLabelsConfigFunction);
    expressions.registerFunction(annotationLayerConfigFunction);
    expressions.registerFunction(labelsOrientationConfigFunction);
    expressions.registerFunction(referenceLineLayerConfigFunction);
    expressions.registerFunction(axisTitlesVisibilityConfigFunction);
    expressions.registerFunction(xyVisFunction);
  }

  public start(core: CoreStart) {}

  public stop() {}
}
