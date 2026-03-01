/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { SCRIPT_PANEL_EMBEDDABLE_TYPE } from '../common/constants';
import { scriptPanelEmbeddableSchema } from './schemas';
import type { SetupDeps, StartDeps } from './types';

export class ScriptPanelPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    plugins.embeddable.registerTransforms(SCRIPT_PANEL_EMBEDDABLE_TYPE, {
      getSchema: () => scriptPanelEmbeddableSchema,
    });
  }

  start(core: CoreStart, plugins: StartDeps) {}
}
