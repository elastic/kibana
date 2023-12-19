/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { imageFunction } from '../common/expression_functions';

interface SetupDeps {
  expressions: ExpressionsServerSetup;
}

export type ExpressionImagePluginSetup = void;
export type ExpressionImagePluginStart = void;

export class ExpressionImagePlugin
  implements Plugin<ExpressionImagePluginSetup, ExpressionImagePluginStart, SetupDeps, {}>
{
  public setup(_core: CoreSetup, { expressions }: SetupDeps): ExpressionImagePluginSetup {
    expressions.registerFunction(imageFunction);
  }

  public start(_core: CoreStart): ExpressionImagePluginStart {}

  public stop() {}
}
