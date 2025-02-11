/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';

export interface MigratorConfig {
  /** The index prefix for this migrator. e.g '.kibana' */
  indexPrefix: string;
  /** The id of the types this migrator is in charge of */
  types: string[];
}

export const buildMigratorConfigs = ({
  typeRegistry,
  kibanaIndexPrefix,
}: {
  typeRegistry: ISavedObjectTypeRegistry;
  kibanaIndexPrefix: string;
}): MigratorConfig[] => {
  const configMap = new Map<string, MigratorConfig>();
  typeRegistry.getAllTypes().forEach((type) => {
    const typeIndexPrefix = type.indexPattern ?? kibanaIndexPrefix;
    if (!configMap.has(typeIndexPrefix)) {
      configMap.set(typeIndexPrefix, {
        indexPrefix: typeIndexPrefix,
        types: [],
      });
    }
    const migratorConfig = configMap.get(typeIndexPrefix)!;
    migratorConfig.types.push(type.name);
  });
  return [...configMap.values()];
};
