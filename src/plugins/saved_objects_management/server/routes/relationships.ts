/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { chain } from 'lodash';
import { findRelationships } from '../lib';
import type { ISavedObjectsManagement } from '../services';
import type { v1 } from '../../common';

export const registerRelationshipsRoute = (
  router: IRouter,
  managementServicePromise: Promise<ISavedObjectsManagement>
) => {
  router.get(
    {
      path: '/api/kibana/management/saved_objects/relationships/{type}/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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
      const { getClient, typeRegistry } = (await context.core).savedObjects;
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

      const findRelationsResponse: v1.RelationshipsResponseHTTP = await findRelationships({
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
