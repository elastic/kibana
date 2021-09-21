/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ExpressionsStart, ExpressionsSetup } from '../../expressions/public';
import { imageRenderer } from './expression_renderers';
import { imageFunction } from '../common/expression_functions';

interface SetupDeps {
  expressions: ExpressionsSetup;
}

interface StartDeps {
  expression: ExpressionsStart;
}

export type ExpressionImagePluginSetup = void;
export type ExpressionImagePluginStart = void;

export class ExpressionImagePlugin
  implements Plugin<ExpressionImagePluginSetup, ExpressionImagePluginStart, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionImagePluginSetup {
    expressions.registerFunction(imageFunction);
    expressions.registerRenderer(imageRenderer);
  }

  public start(core: CoreStart): ExpressionImagePluginStart {}

  public stop() {}
}
