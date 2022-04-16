/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, SavedObjectsCreatePointInTimeFinderOptions } from '@kbn/core/server';
import { chain } from 'lodash';
import { findAll } from '../lib';

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
      const { getClient, typeRegistry } = context.core.savedObjects;
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
        perPage: 1000,
      };
      if (searchString) {
        findOptions.search = `${searchString}*`;
        findOptions.searchFields = ['title'];
      }
      if (references) {
        findOptions.hasReference = references;
        findOptions.hasReferenceOperator = 'OR';
      }

      const objects = await findAll(client, findOptions);

      const counts = objects.reduce((accum, result) => {
        const type = result.type;
        accum[type] = accum[type] || 0;
        accum[type]++;
        return accum;
      }, {} as Record<string, number>);

      for (const type of typesToInclude) {
        if (!counts[type]) {
          counts[type] = 0;
        }
      }

      return res.ok({
        body: counts,
      });
    })
  );
};
