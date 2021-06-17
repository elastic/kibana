/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import {
  ElementFactory,
  StartInitializer,
  ExpressionRevealImageFunction,
} from '../../common/types';
import { renderers } from '../expression_renderers';
import { functions } from '../expression_functions';
import { uiViews } from '../ui_views';
import { RevealImageRendererConfig } from '../expression_renderers/types';

export type ExpressionServiceSetup = Pick<ExpressionService, 'registerExpression'>;

export interface ExpressionSetup {
  renderers: Array<() => ExpressionRenderDefinition<RevealImageRendererConfig>>;
  uiViews: Array<StartInitializer<unknown>>;
  functions: ExpressionRevealImageFunction[];
}

export type ExpressionServiceStart = void;

export class ExpressionService {
  public readonly registerExpression: (fn?: (expressions: ExpressionSetup) => void) => void = (
    fn
  ) => {
    if (fn && typeof fn === 'function') {
      fn({ renderers, uiViews, functions });
    }
  };

  public setup(): ExpressionServiceSetup {
    const { registerExpression } = this;
    return Object.freeze({
      registerExpression,
    });
  }

  public start(): ExpressionServiceStart {}

  public stop() {}
}
