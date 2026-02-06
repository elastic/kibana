/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType } from '@kbn/config-schema';
import type { getDrilldownRegistry } from '../drilldowns/registry';
import type { EmbeddableTransformsSetup } from './types';

export function getTransformsRegistry(drilldownRegistry: ReturnType<typeof getDrilldownRegistry>) {
  const transformsRegistry: { [key: string]: EmbeddableTransformsSetup<any, any> } = {};

  return {
    registerTransforms: (type: string, transforms: EmbeddableTransformsSetup<any, any>) => {
      if (transformsRegistry[type]) {
        throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
      }

      transformsRegistry[type] = transforms;
    },
    getAllEmbeddableSchemas: () =>
      Object.values(transformsRegistry)
        .map((transformsSetup) => transformsSetup?.getSchema?.(drilldownRegistry.getSchema))
        .filter((schema) => Boolean(schema)) as ObjectType[],
    getEmbeddableTransforms: (type: string) => {
      const { getTransforms, getSchema, throwOnUnmappedPanel } = transformsRegistry[type] ?? {};
      return {
        ...getTransforms?.(drilldownRegistry.transforms),
        ...(getSchema ? { schema: getSchema(drilldownRegistry.getSchema) } : {}),
        ...(typeof throwOnUnmappedPanel === 'boolean' ? { throwOnUnmappedPanel } : {}),
      };
    },
  };
}
