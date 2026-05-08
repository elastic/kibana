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
import type { EmbeddableServerDefinition } from './types';

export function getEmbeddableServerRegistry(
  drilldownRegistry: ReturnType<typeof getDrilldownRegistry>
) {
  const registry: { [key: string]: EmbeddableServerDefinition<any, any> } = {};

  return {
    registerEmbeddableServerDefinition: (
      type: string,
      definition: EmbeddableServerDefinition<any, any>
    ) => {
      if (registry[type]) {
        throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
      }

      registry[type] = definition;
    },
    getAllEmbeddableSchemas: () => {
      const schemas: { [key: string]: { schema: ObjectType; title: string } } = {};
      Object.entries(registry).forEach(([type, definition]) => {
        const schema = definition?.getSchema?.(drilldownRegistry.getSchema);
        if (schema) {
          schemas[type] = {
            schema: schema as ObjectType,
            title: definition.title,
          };
        }
      });
      return schemas;
    },
    getEmbeddableTransforms: (type: string) => {
      const { getTransforms, getSchema, throwOnUnmappedPanel } = registry[type] ?? {};
      return {
        ...getTransforms?.(drilldownRegistry.transforms),
        ...(getSchema ? { schema: getSchema(drilldownRegistry.getSchema) } : {}),
        ...(typeof throwOnUnmappedPanel === 'boolean' ? { throwOnUnmappedPanel } : {}),
      };
    },
  };
}
