/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

export interface FavoritesSavedObjectAttributes {
  userId: string;
  type: string;
  favoriteIds: string[];
}

const schemaV1 = schema.object({
  userId: schema.string(),
  type: schema.string(), // object type, e.g. dashboard
  favoriteIds: schema.arrayOf(schema.string()),
});

export const favoritesSavedObjectType: SavedObjectsType = {
  name: 'favorites',
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        // The forward compatible schema should allow any future versions of
        // this SO to be converted to this version, since we are using
        // @kbn/config-schema we opt-in to unknowns to allow the schema to
        // successfully "downgrade" future SOs to this version.
        forwardCompatibility: schemaV1.extends({}, { unknowns: 'ignore' }),
        create: schemaV1,
      },
    },
  },
};
