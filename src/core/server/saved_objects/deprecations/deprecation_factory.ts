/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RegisterDeprecationsConfig } from '../../deprecations';
import type { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import type { SavedObjectConfig } from '../saved_objects_config';
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
