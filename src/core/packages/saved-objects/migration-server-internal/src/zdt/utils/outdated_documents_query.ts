/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { getVirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';

interface GetOutdatedDocumentsQueryOps {
  types: SavedObjectsType[];
}

export const getOutdatedDocumentsQuery = ({
  types,
}: GetOutdatedDocumentsQueryOps): QueryDslQueryContainer => {
  // Note: in theory, we could check the difference of model version with the index's
  // and narrow the search filter only on the type that have different versions.
  // however, it feels safer to just search for all outdated document, just in case.
  const virtualVersions = getVirtualVersionMap(types);
  return {
    bool: {
      should: types.map((type) => {
        const virtualVersion = virtualVersions[type.name];
        return {
          bool: {
            must: [
              { term: { type: type.name } },
              { range: { typeMigrationVersion: { lt: virtualVersion } } },
            ],
          },
        };
      }),
    },
  };
};
