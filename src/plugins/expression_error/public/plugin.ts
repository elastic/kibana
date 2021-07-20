/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ExpressionsStart, ExpressionsSetup } from '../../expressions/public';
import { errorRenderer, debugRenderer } from './expression_renderers';

interface SetupDeps {
  expressions: ExpressionsSetup;
}

interface StartDeps {
  expression: ExpressionsStart;
}

export type ExpressionErrorPluginSetup = void;
export type ExpressionErrorPluginStart = void;

export class ExpressionErrorPlugin
  implements Plugin<ExpressionErrorPluginSetup, ExpressionErrorPluginStart, SetupDeps, StartDeps> {
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionErrorPluginSetup {
    expressions.registerRenderer(errorRenderer);
    expressions.registerRenderer(debugRenderer);
  }

  public start(core: CoreStart): ExpressionErrorPluginStart {}

  public stop() {}
}
