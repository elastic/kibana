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
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: VisTypeVegaPluginSetupDependencies) {
    core
      .getStartServices()
      .then(async ([{ featureFlags }]) => {
        const standaloneEmbeddableEnabled = await featureFlags.getBooleanValue(
          VEGA_STANDALONE_EMBEDDABLE_FLAG,
          false
        );
        embeddable.registerEmbeddableServerDefinition(VEGA_EMBEDDABLE_TYPE, {
          title: 'Vega',
          getTransforms,
          getSchema: (getDrilldownsSchema) =>
            standaloneEmbeddableEnabled ? getVegaEmbeddableSchema(getDrilldownsSchema) : undefined,
        });
      })
      .catch(() => {});
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
