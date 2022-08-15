/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Container } from 'inversify';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ExpressionsService, ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import { ExpressionsModule, UiSettingsClientToken } from '../common/module';
import {
  ExpressionsPublicModule,
  ExpressionLoaderProviderToken,
  ExpressionRenderHandlerProviderToken,
  NotificationsToken,
} from './module';
import { setContainer } from './services';
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
  private readonly container = new Container({ skipBaseClassChecks: true });

  constructor(context: PluginInitializerContext) {
    this.container.load(ExpressionsModule());
    this.container.load(ExpressionsPublicModule());
  }

  public setup({}: CoreSetup): ExpressionsSetup {
    setContainer(this.container);

    const setup = this.container.get(ExpressionsService).setup();

    return Object.freeze(setup);
  }

  public start({ notifications, uiSettings }: CoreStart): ExpressionsStart {
    this.container.bind(NotificationsToken).toConstantValue(notifications);
    this.container.bind(UiSettingsClientToken).toConstantValue(uiSettings);

    const start = this.container.get(ExpressionsService).start();

    return Object.freeze({
      ...start,
      loader: this.container.get(ExpressionLoaderProviderToken),
      render: this.container.get(ExpressionRenderHandlerProviderToken),
      ReactExpressionRenderer,
    });
  }

  public stop() {
    this.container.get(ExpressionsService).stop();
  }
}
