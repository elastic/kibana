/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { DefaultEditorController } from './default_editor_controller';
import { setAnalytics, setI18n, setTheme } from './services';

export interface VisDefaultEditorSetupDependencies {
  visualizations: VisualizationsSetup;
}

export class VisDefaultEditorPlugin
  implements Plugin<void, void, VisDefaultEditorSetupDependencies, {}>
{
  public setup(core: CoreSetup, { visualizations }: VisDefaultEditorSetupDependencies) {
    setAnalytics(core.analytics);
    setTheme(core.theme);
    if (visualizations) {
      visualizations.visEditorsRegistry.registerDefault(DefaultEditorController);
    }
  }

  public start(core: CoreStart) {
    setI18n(core.i18n);
  }

  stop() {}
}
