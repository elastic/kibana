/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { RegisterDeprecationsConfig } from '@kbn/core-deprecations-server';
import { getUnknownTypesDeprecations } from './unknown_object_types';

interface GetDeprecationProviderOptions {
  typeRegistry: ISavedObjectTypeRegistry;
  savedObjectsConfig: SavedObjectConfig;
  kibanaIndex: string;
  kibanaVersion: string;
}

export const getSavedObjectsDeprecationsProvider = (
  config: GetDeprecationProviderOptions
): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (context) => {
      return [
        ...(await getUnknownTypesDeprecations({
          ...config,
          esClient: context.esClient,
        })),
      ];
    },
  };
};
