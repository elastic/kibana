/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import {
  ExpressionsService,
  setRenderersRegistry,
  setNotifications,
  setExpressionsService,
} from './services';
import { ReactExpressionRenderer } from './react_expression_renderer';
import { ExpressionLoader, IExpressionLoader, loader } from './loader';
import { render, ExpressionRenderHandler } from './render';

/**
 * Expressions public setup contract, extends {@link ExpressionsServiceSetup}
 */
export type ExpressionsSetup = ExpressionsServiceSetup;

/**
 * Expressions public start contrect, extends {@link ExpressionServiceStart}
 */
export interface ExpressionsStart extends ExpressionsServiceStart {
  ExpressionLoader: typeof ExpressionLoader;
  ExpressionRenderHandler: typeof ExpressionRenderHandler;
  loader: IExpressionLoader;
  ReactExpressionRenderer: typeof ReactExpressionRenderer;
  render: typeof render;
}

export class ExpressionsPublicPlugin implements Plugin<ExpressionsSetup, ExpressionsStart> {
  private readonly expressions: ExpressionsService = new ExpressionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  private configureExecutor(core: CoreSetup) {
    const { executor } = this.expressions;

    executor.extendContext({
      environment: 'client',
    });
  }

  public setup(core: CoreSetup): ExpressionsSetup {
    this.configureExecutor(core);

    const { expressions } = this;
    const { renderers } = expressions;

    setRenderersRegistry(renderers);
    setExpressionsService(expressions);

    const setup = expressions.setup(pick(core, 'getStartServices'));

    return Object.freeze(setup);
  }

  public start(core: CoreStart): ExpressionsStart {
    setNotifications(core.notifications);

    const { expressions } = this;
    const start = {
      ...expressions.start(),
      ExpressionLoader,
      ExpressionRenderHandler,
      loader,
      ReactExpressionRenderer,
      render,
    };

    return Object.freeze(start);
  }

  public stop() {
    this.expressions.stop();
  }
}
