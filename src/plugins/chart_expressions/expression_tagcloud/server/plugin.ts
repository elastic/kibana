/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ExpressionsServerStart, ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { tagcloudFunction } from '../common/expression_functions';

interface SetupDeps {
  expressions: ExpressionsServerSetup;
}

interface StartDeps {
  expression: ExpressionsServerStart;
}

export type ExpressionTagcloudPluginSetup = void;
export type ExpressionTagcloudPluginStart = void;

export class ExpressionTagcloudPlugin
  implements
    Plugin<ExpressionTagcloudPluginSetup, ExpressionTagcloudPluginStart, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup, { expressions }: SetupDeps): ExpressionTagcloudPluginSetup {
    expressions.registerFunction(tagcloudFunction);
  }

  public start(core: CoreStart): ExpressionTagcloudPluginStart {}

  public stop() {}
}
