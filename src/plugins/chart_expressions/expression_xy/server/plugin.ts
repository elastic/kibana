/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

import { ExpressionXyPluginSetup, ExpressionXyPluginStart } from './types';
import {
  xyVisFunction,
  legendConfigFunction,
  dataDecorationConfigFunction,
  xAxisConfigFunction,
  yAxisConfigFunction,
  referenceLineDecorationConfigFunction,
  axisExtentConfigFunction,
  annotationLayerFunction,
  referenceLineFunction,
  extendedDataLayerFunction,
  referenceLineLayerFunction,
  layeredXyVisFunction,
  extendedAnnotationLayerFunction,
} from '../common/expression_functions';
import { SetupDeps } from './types';
import { eventAnnotationsResult } from '../common/expression_functions/event_annotations_result';

export class ExpressionXyPlugin
  implements Plugin<ExpressionXyPluginSetup, ExpressionXyPluginStart>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps) {
    expressions.registerFunction(yAxisConfigFunction);
    expressions.registerFunction(dataDecorationConfigFunction);
    expressions.registerFunction(xAxisConfigFunction);
    expressions.registerFunction(referenceLineDecorationConfigFunction);
    expressions.registerFunction(legendConfigFunction);
    expressions.registerFunction(extendedDataLayerFunction);
    expressions.registerFunction(axisExtentConfigFunction);
    expressions.registerFunction(annotationLayerFunction);
    expressions.registerFunction(extendedAnnotationLayerFunction);
    expressions.registerFunction(eventAnnotationsResult);
    expressions.registerFunction(referenceLineFunction);
    expressions.registerFunction(referenceLineLayerFunction);
    expressions.registerFunction(xyVisFunction);
    expressions.registerFunction(layeredXyVisFunction);
  }

  public start(core: CoreStart) {}

  public stop() {}
}
