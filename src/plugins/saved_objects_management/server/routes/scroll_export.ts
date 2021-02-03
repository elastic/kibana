/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { findAll } from '../lib';

export const registerScrollForExportRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/kibana/management/saved_objects/scroll/export',
      validate: {
        body: schema.object({
          typesToInclude: schema.arrayOf(schema.string()),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { client } = context.core.savedObjects;
      const objects = await findAll(client, {
        perPage: 1000,
        type: req.body.typesToInclude,
      });

      return res.ok({
        body: objects.map((hit) => {
          return {
            _id: hit.id,
            _source: hit.attributes,
            _meta: {
              savedObjectVersion: 2,
            },
            _migrationVersion: hit.migrationVersion,
            _references: hit.references || [],
          };
        }),
      });
    })
  );
};
