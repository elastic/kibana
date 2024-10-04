/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObjectsCreatePointInTimeFinderOptions } from '@kbn/core/server';
import { chain } from 'lodash';
import type { v1 } from '../../common';
import { getSavedObjectCounts } from '../lib';

export const registerScrollForCountRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/kibana/management/saved_objects/scroll/counts',
      validate: {
        body: schema.object({
          typesToInclude: schema.arrayOf(schema.string()),
          searchString: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { getClient, typeRegistry } = (await context.core).savedObjects;
      const { typesToInclude, searchString, references } = req.body;

      const includedHiddenTypes = chain(typesToInclude)
        .uniq()
        .filter(
          (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
        )
        .value();

      const client = getClient({ includedHiddenTypes });
      const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
        type: typesToInclude,
        ...(searchString ? { search: `${searchString}*`, searchFields: ['title'] } : {}),
        ...(references ? { hasReference: references, hasReferenceOperator: 'OR' } : {}),
      };

      const rawCounts = await getSavedObjectCounts({
        types: typesToInclude,
        client,
        options: findOptions,
      });

      const counts: Record<string, number> = {};
      for (const type of typesToInclude) {
        counts[type] = rawCounts[type] ?? 0;
      }

      const body: v1.ScrollCountResponseHTTP = counts;

      return res.ok({
        body,
      });
    })
  );
};
