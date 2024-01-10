/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { revealImageFunction } from '../common';

interface SetupDeps {
  expressions: ExpressionsServerSetup;
}

export type ExpressionRevealImagePluginSetup = void;
export type ExpressionRevealImagePluginStart = void;

export class ExpressionRevealImagePlugin
  implements
    Plugin<ExpressionRevealImagePluginSetup, ExpressionRevealImagePluginStart, SetupDeps, {}>
{
  public setup(_core: CoreSetup, { expressions }: SetupDeps): ExpressionRevealImagePluginSetup {
    expressions.registerFunction(revealImageFunction);
  }

  public start(_core: CoreStart): ExpressionRevealImagePluginStart {}

  public stop() {}
}
