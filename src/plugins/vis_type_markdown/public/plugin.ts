/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';

import { markdownVisDefinition } from './markdown_vis';
import { createMarkdownVisFn } from './markdown_fn';
import { ConfigSchema } from '../config';

import './index.scss';
import { getMarkdownRenderer } from './markdown_renderer';
import { createStartServicesGetter } from '../../kibana_utils/public';

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
    const start = createStartServicesGetter(core.getStartServices);
    visualizations.createBaseVisualization(markdownVisDefinition);
    expressions.registerRenderer(getMarkdownRenderer(start));
    expressions.registerFunction(createMarkdownVisFn);
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
