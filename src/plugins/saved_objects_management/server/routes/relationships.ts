/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { findRelationships } from '../lib';
import { ISavedObjectsManagement } from '../services';

export const registerRelationshipsRoute = (
  router: IRouter,
  managementServicePromise: Promise<ISavedObjectsManagement>
) => {
  router.get(
    {
      path: '/api/kibana/management/saved_objects/relationships/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          size: schema.number({ defaultValue: 10000 }),
          savedObjectTypes: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const managementService = await managementServicePromise;
      const { client } = context.core.savedObjects;
      const { type, id } = req.params;
      const { size } = req.query;
      const savedObjectTypes = Array.isArray(req.query.savedObjectTypes)
        ? req.query.savedObjectTypes
        : [req.query.savedObjectTypes];

      const relations = await findRelationships({
        type,
        id,
        client,
        size,
        referenceTypes: savedObjectTypes,
        savedObjectsManagement: managementService,
      });

      return res.ok({
        body: relations,
      });
    })
  );
};
