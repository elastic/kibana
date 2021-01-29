/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';

import { markdownVisDefinition } from './markdown_vis';
import { createMarkdownVisFn } from './markdown_fn';
import { ConfigSchema } from '../config';
import { markdownVisRenderer } from './markdown_renderer';

/** @internal */
export interface MarkdownPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export class MarkdownPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { expressions, visualizations }: MarkdownPluginSetupDependencies) {
    visualizations.createBaseVisualization(markdownVisDefinition);
    expressions.registerRenderer(markdownVisRenderer);
    expressions.registerFunction(createMarkdownVisFn);
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
