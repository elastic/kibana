/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { DATA_TABLE_JSON_VIEW_FEATURE_FLAG_KEY } from '../common/constants';
// Keep consumers independent from feature-specific schema selection through this stable facade.
import { getDiscoverSessionApiSchemas } from './api/schema_override';
import { getDiscoverSessionEmbeddableSchema } from './embeddable/schema_override';

/** Keeps schema access stable while selecting the active variants once feature flags resolve. */
const createDiscoverSessionSchemaProvider = () => {
  const setActiveSchemas = (schemaFeatures: { readonly dataTableJsonView: boolean }) => ({
    api: getDiscoverSessionApiSchemas(schemaFeatures),
    embeddable: getDiscoverSessionEmbeddableSchema(schemaFeatures),
  });

  // Consumers cache whatever these getters return, so they must never throw: the restricted
  // variants stay active until the flag resolves.
  let activeSchemas = setActiveSchemas({ dataTableJsonView: false });

  return {
    getApiSchemas: () => activeSchemas.api,
    getEmbeddableSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
      activeSchemas.embeddable(getDrilldownsSchema),
    initialize: async (featureFlags: CoreStart['featureFlags']) => {
      activeSchemas = setActiveSchemas({
        dataTableJsonView: await featureFlags.getBooleanValue(
          DATA_TABLE_JSON_VIEW_FEATURE_FLAG_KEY,
          false
        ),
      });
    },
  };
};

export const discoverSessionSchemaProvider = createDiscoverSessionSchemaProvider();
