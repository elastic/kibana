/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { chain } from 'lodash';
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
      const { getClient, typeRegistry } = context.core.savedObjects;
      const { type, id } = req.params;
      const { size, savedObjectTypes: maybeArraySavedObjectTypes } = req.query;
      const savedObjectTypes = Array.isArray(maybeArraySavedObjectTypes)
        ? maybeArraySavedObjectTypes
        : [maybeArraySavedObjectTypes];

      const includedHiddenTypes = chain(maybeArraySavedObjectTypes)
        .uniq()
        .filter(
          (entry) => typeRegistry.isHidden(entry) && typeRegistry.isImportableAndExportable(entry)
        )
        .value();

      const client = getClient({ includedHiddenTypes });

      const findRelationsResponse = await findRelationships({
        type,
        id,
        client,
        size,
        referenceTypes: savedObjectTypes,
        savedObjectsManagement: managementService,
      });

      return res.ok({
        body: findRelationsResponse,
      });
    })
  );
};
