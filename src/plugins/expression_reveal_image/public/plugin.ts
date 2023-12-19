/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { revealImageRendererFactory } from './expression_renderers';
import { revealImageFunction } from '../common/expression_functions';

interface SetupDeps {
  expressions: ExpressionsSetup;
}

export type ExpressionRevealImagePluginSetup = void;
export type ExpressionRevealImagePluginStart = void;

export class ExpressionRevealImagePlugin
  implements
    Plugin<ExpressionRevealImagePluginSetup, ExpressionRevealImagePluginStart, SetupDeps, {}>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionRevealImagePluginSetup {
    expressions.registerFunction(revealImageFunction);
    expressions.registerRenderer(revealImageRendererFactory(core));
  }

  public start(core: CoreStart): ExpressionRevealImagePluginStart {}

  public stop() {}
}
