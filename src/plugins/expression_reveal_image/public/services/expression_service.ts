/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { ElementFactory, StartInitializer } from '../../common/types';
import { elements, renderers, uiViews } from '../';
import { RevealImageRendererConfig } from '../expression_renderers/types';

export type ExpressionServiceSetup = Pick<
  ExpressionService,
  'getRenderers' | 'getViews' | 'getElements'
>;

export interface ExpressionsServiceSetup {
  getViews: () => Array<StartInitializer<unknown>>;
  getRenderers: () => Array<() => ExpressionRenderDefinition<RevealImageRendererConfig>>;
  getElements: () => ElementFactory[];
}

export type ExpressionsServiceStart = ExpressionsServiceSetup;

export class ExpressionService {
  public readonly getElements = (): ElementFactory[] => elements;
  public readonly getRenderers = (): Array<
    () => ExpressionRenderDefinition<RevealImageRendererConfig>
  > => renderers;
  public readonly getViews = (): Array<StartInitializer<unknown>> => uiViews;

  public setup(...args: unknown[]): ExpressionsServiceSetup {
    return this;
  }

  public start(...args: unknown[]): ExpressionsServiceStart {
    return this;
  }

  public stop() {}
}
