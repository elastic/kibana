/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ExpressionsStart, ExpressionsSetup } from '../../expressions/public';
import { revealImageFunction } from './expression_functions';
import { revealImageRenderer } from './expression_renderers';

interface SetupDeps {
  expressions: ExpressionsSetup;
}

interface StartDeps {
  expression: ExpressionsStart;
}

export type ExpressionRevealImagePluginSetup = void;
export type ExpressionRevealImagePluginStart = void;

export class ExpressionRevealImagePlugin
  implements
    Plugin<
      ExpressionRevealImagePluginSetup,
      ExpressionRevealImagePluginStart,
      SetupDeps,
      StartDeps
    > {
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionRevealImagePluginSetup {
    expressions.registerFunction(revealImageFunction);
    expressions.registerRenderer(revealImageRenderer);
  }

  public start(core: CoreStart): ExpressionRevealImagePluginStart {}

  public stop() {}
}
