/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectTestkitDefinition } from './types';

export interface TestkitTypeRegistries {
  registryBefore: SavedObjectTypeRegistry;
  registryAfter: SavedObjectTypeRegistry;
}

/**
 * Create the 'before' and 'after' type registries from the provided testkit type definitions.
 */
export const getTypeRegistries = ({
  types,
  kibanaIndex,
}: {
  types: SavedObjectTestkitDefinition[];
  kibanaIndex: string;
}): TestkitTypeRegistries => {
  const registryBefore = new SavedObjectTypeRegistry();
  const registryAfter = new SavedObjectTypeRegistry();

  for (const definition of types) {
    const { typeBefore, typeAfter } = getTypes({ definition, kibanaIndex });
    registryBefore.registerType(typeBefore);
    registryAfter.registerType(typeAfter);
  }

  return {
    registryBefore,
    registryAfter,
  };
};

const getTypes = ({
  definition,
  kibanaIndex,
}: {
  definition: SavedObjectTestkitDefinition;
  kibanaIndex: string;
}): { typeBefore: SavedObjectsType; typeAfter: SavedObjectsType } => {
  const modelVersionMap =
    typeof definition.definition.modelVersions === 'function'
      ? definition.definition.modelVersions()
      : definition.definition.modelVersions ?? {};

  const typeBefore: SavedObjectsType = {
    ...definition.definition,
    indexPattern: kibanaIndex,
    modelVersions: removeKeysGreaterThan(modelVersionMap, definition.modelVersionBefore),
  };

  const typeAfter: SavedObjectsType = {
    ...definition.definition,
    indexPattern: kibanaIndex,
    modelVersions: removeKeysGreaterThan(modelVersionMap, definition.modelVersionAfter),
  };

  return {
    typeBefore,
    typeAfter,
  };
};

const removeKeysGreaterThan = <T extends Record<string, unknown>>(
  record: T,
  version: number
): T => {
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => {
      return parseInt(key, 10) <= version;
    })
  ) as T;
};
