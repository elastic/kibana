/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import type { ReactExpressionRenderer } from './react_expression_renderer_wrapper';
import type { IExpressionLoader } from './loader';
import type { IExpressionRenderer } from './render';
/**
 * Expressions public setup contract, extends {@link ExpressionsServiceSetup}
 */
export type ExpressionsSetup = ExpressionsServiceSetup;
/**
 * Expressions public start contrect, extends {@link ExpressionServiceStart}
 */
export interface ExpressionsStart extends ExpressionsServiceStart {
  loader: IExpressionLoader;
  render: IExpressionRenderer;
  ReactExpressionRenderer: typeof ReactExpressionRenderer;
}
export declare class ExpressionsPublicPlugin implements Plugin<ExpressionsSetup, ExpressionsStart> {
  private static logger;
  private readonly expressions;
  constructor(initializerContext: PluginInitializerContext);
  setup(core: CoreSetup): ExpressionsSetup;
  start(core: CoreStart): ExpressionsStart;
  stop(): void;
}
