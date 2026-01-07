/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ObjectType } from '@kbn/config-schema';
import type { EmbeddableTransforms } from '../common';
import { EnhancementsRegistry } from '../common/enhancements/registry';
import { EmbeddableSetup, EmbeddableStart } from './types';
import { registerPersistableState } from './bwc/persistable_state/registry';

export class EmbeddableServerPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private enhancementsRegistry = new EnhancementsRegistry();
  private transformsRegistry: { [key: string]: EmbeddableTransforms<any, any> } = {};

  public setup(core: CoreSetup) {
    return {
      registerTransforms: (type: string, transforms: EmbeddableTransforms<any, any>) => {
        if (this.transformsRegistry[type]) {
          throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
        }

        this.transformsRegistry[type] = transforms;
      },
      registerEnhancement: this.enhancementsRegistry.registerEnhancement,
      transformEnhancementsIn: this.enhancementsRegistry.transformIn,
      transformEnhancementsOut: this.enhancementsRegistry.transformOut,
      bwc: {
        registerPersistableState
      }
    };
  }

  public start(core: CoreStart) {
    return {
      getEmbeddableSchemas: () =>
        Object.values(this.transformsRegistry)
          .map((transforms) => transforms.schema)
          .filter((schema) => Boolean(schema)) as ObjectType[],
      getTransforms: (type: string) => {
        return this.transformsRegistry[type];
      },
    };
  }

  public stop() {}
}
