/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

import { ADD_PANEL_TRIGGER, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { markdownVisType } from './markdown_vis';
import { createMarkdownVisFn } from './markdown_fn';
import type { ConfigSchema } from '../server/config';
import { getMarkdownVisRenderer } from './markdown_renderer';

interface MarkdownSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

export interface MarkdownStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
}

/** @internal */
export class MarkdownPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { expressions, visualizations }: MarkdownSetupDependencies) {
    visualizations.createBaseVisualization(markdownVisType);
    expressions.registerRenderer(getMarkdownVisRenderer({ getStartDeps: core.getStartServices }));
    expressions.registerFunction(createMarkdownVisFn);
  }

  public start(core: CoreStart, deps: MarkdownStartDependencies) {
    deps.uiActions.registerActionAsync('addMarkdownAction', async () => {
      const { getAddMarkdownPanelAction } = await import('./add_markdown_panel_action');
      return getAddMarkdownPanelAction(deps);
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, 'addMarkdownAction');
  }
}
