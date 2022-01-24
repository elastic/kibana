/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/public';

import { DefaultEditorController } from './default_editor_controller';
import { setTheme } from './services';
import type { VisualizationsSetup } from '../../visualizations/public';

export interface VisDefaultEditorSetupDependencies {
  visualizations: VisualizationsSetup;
}

export class VisDefaultEditorPlugin
  implements Plugin<void, void, VisDefaultEditorSetupDependencies, {}>
{
  public setup(core: CoreSetup, { visualizations }: VisDefaultEditorSetupDependencies) {
    setTheme(core.theme);
    if (visualizations) {
      visualizations.visEditorsRegistry.registerDefault(DefaultEditorController);
    }
  }

  public start() {}

  stop() {}
}
