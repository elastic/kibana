/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, SavedObjectsFindOptions } from 'src/core/server';
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
      const { client } = context.core.savedObjects;

      const findOptions: SavedObjectsFindOptions = {
        type: req.body.typesToInclude,
        perPage: 1000,
      };
      if (req.body.searchString) {
        findOptions.search = `${req.body.searchString}*`;
        findOptions.searchFields = ['title'];
      }
      if (req.body.references) {
        findOptions.hasReference = req.body.references;
        findOptions.hasReferenceOperator = 'OR';
      }

      const objects = await findAll(client, findOptions);

      const counts = objects.reduce((accum, result) => {
        const type = result.type;
        accum[type] = accum[type] || 0;
        accum[type]++;
        return accum;
      }, {} as Record<string, number>);

      for (const type of req.body.typesToInclude) {
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
