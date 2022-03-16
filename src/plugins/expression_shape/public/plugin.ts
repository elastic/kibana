/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ExpressionsStart, ExpressionsSetup } from '../../expressions/public';
import { shapeRendererFactory, progressRendererFactory } from './expression_renderers';
import { shapeFunction, progressFunction } from '../common/expression_functions';

interface SetupDeps {
  expressions: ExpressionsSetup;
}

interface StartDeps {
  expression: ExpressionsStart;
}

export type ExpressionShapePluginSetup = void;
export type ExpressionShapePluginStart = void;

export class ExpressionShapePlugin
  implements Plugin<ExpressionShapePluginSetup, ExpressionShapePluginStart, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionShapePluginSetup {
    expressions.registerFunction(shapeFunction);
    expressions.registerFunction(progressFunction);
    expressions.registerRenderer(shapeRendererFactory(core));
    expressions.registerRenderer(progressRendererFactory(core));
  }

  public start(core: CoreStart): ExpressionShapePluginStart {}

  public stop() {}
}
