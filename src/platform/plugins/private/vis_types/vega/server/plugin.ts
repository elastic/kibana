/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type {
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';
import { VEGA_EMBEDDABLE_TYPE, VEGA_STANDALONE_EMBEDDABLE_FLAG } from '../common/constants';
import { getVegaEmbeddableSchema } from './embeddable/schema';
import { getTransforms } from './embeddable/transforms';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  private standaloneEmbeddableEnabled = false;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: VisTypeVegaPluginSetupDependencies) {
    embeddable.registerEmbeddableServerDefinition(VEGA_EMBEDDABLE_TYPE, {
      title: 'Vega',
      getTransforms,
      getSchema: (getDrilldownsSchema) =>
        this.standaloneEmbeddableEnabled ? getVegaEmbeddableSchema(getDrilldownsSchema) : undefined,
    });
    return {};
  }

  public start(core: CoreStart) {
    // Startup-only: public API/OpenAPI contract should not hot-swap mid-process.
    void core.featureFlags
      .getBooleanValue(VEGA_STANDALONE_EMBEDDABLE_FLAG, false)
      .then((enabled) => {
        this.standaloneEmbeddableEnabled = enabled;
      })
      .catch(() => {});
    return {};
  }
}
