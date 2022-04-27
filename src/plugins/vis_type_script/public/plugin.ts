/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';

import { getScriptVisDefinition } from './vis_definition';
import { ConfigSchema } from '../config';
import { scriptVisRenderer } from './expression/renderer';
import { createScriptVisFn } from './expression/fn';
import { DataPublicPluginStart } from '../../data/public';

/** @internal */
export interface ScriptVisPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface ScriptVisPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class ScriptVisPlugin
  implements Plugin<void, void, ScriptVisPluginSetupDependencies, ScriptVisPluginStartDependencies>
{
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<ScriptVisPluginStartDependencies>,
    { expressions, visualizations }: ScriptVisPluginSetupDependencies
  ) {
    const validateUrl = core.http.externalUrl.validateUrl;
    visualizations.createBaseVisualization(getScriptVisDefinition(validateUrl));
    expressions.registerRenderer(
      scriptVisRenderer(() =>
        core.getStartServices().then(([coreStart, plugins]) => ({
          data: plugins.data,
          validateUrl,
        }))
      )
    );
    expressions.registerFunction(createScriptVisFn);
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
