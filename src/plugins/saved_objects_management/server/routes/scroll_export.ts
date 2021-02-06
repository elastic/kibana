/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { chain } from 'lodash';
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
      const { typesToInclude } = req.body;
      const { getClient, typeRegistry } = context.core.savedObjects;
      const includedHiddenTypes = chain(typesToInclude)
        .uniq()
        .filter(
          (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
        )
        .value();

      const client = getClient({ includedHiddenTypes });

      const objects = await findAll(client, {
        perPage: 1000,
        type: typesToInclude,
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
