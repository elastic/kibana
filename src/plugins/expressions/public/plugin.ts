/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { SerializableRecord } from '@kbn/utility-types';
import type { ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import {
  ExpressionsService,
  setRenderersRegistry,
  setNotifications,
  setExpressionsService,
} from './services';
import { ReactExpressionRenderer } from './react_expression_renderer_wrapper';
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

export class ExpressionsPublicPlugin implements Plugin<ExpressionsSetup, ExpressionsStart> {
  private readonly expressions: ExpressionsService = new ExpressionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ExpressionsSetup {
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

    const loader: IExpressionLoader = async (element, expression, params) => {
      const { ExpressionLoader } = await import('./loader');
      return new ExpressionLoader(element, expression, params);
    };

    const render: IExpressionRenderer = async (element, data, options) => {
      const { ExpressionRenderHandler } = await import('./render');
      const handler = new ExpressionRenderHandler(element, options);
      handler.render(data as SerializableRecord);
      return handler;
    };

    const start = {
      ...expressions.start(),
      loader,
      render,
      ReactExpressionRenderer,
    };

    return Object.freeze(start);
  }

  public stop() {
    this.expressions.stop();
  }
}
