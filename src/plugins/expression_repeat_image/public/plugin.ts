/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ExpressionsStart, ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { repeatImageFunction } from '../common/expression_functions';
import { repeatImageRendererFactory } from './expression_renderers';

interface SetupDeps {
  expressions: ExpressionsSetup;
}

interface StartDeps {
  expression: ExpressionsStart;
}

export type ExpressionRepeatImagePluginSetup = void;
export type ExpressionRepeatImagePluginStart = void;

export class ExpressionRepeatImagePlugin
  implements
    Plugin<
      ExpressionRepeatImagePluginSetup,
      ExpressionRepeatImagePluginStart,
      SetupDeps,
      StartDeps
    >
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionRepeatImagePluginSetup {
    expressions.registerFunction(repeatImageFunction);
    expressions.registerRenderer(repeatImageRendererFactory(core));
  }

  public start(core: CoreStart): ExpressionRepeatImagePluginStart {}

  public stop() {}
}
