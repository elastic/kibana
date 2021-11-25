/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { DataViewField } from '../../../common';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';

export const registerGetRuntimeFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.get(
    {
      path: '/api/index_patterns/index_pattern/{id}/runtime_field/{name}',
      validate: {
        params: schema.object({
          id: schema.string({
            minLength: 1,
            maxLength: 1_000,
          }),
          name: schema.string({
            minLength: 1,
            maxLength: 1_000,
          }),
        }),
      },
    },

    handleErrors(async (ctx, req, res) => {
      const savedObjectsClient = ctx.core.savedObjects.client;
      const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
      const [, , { indexPatternsServiceFactory }] = await getStartServices();
      const indexPatternsService = await indexPatternsServiceFactory(
        savedObjectsClient,
        elasticsearchClient
      );
      const id = req.params.id;
      const name = req.params.name;

      const indexPattern = await indexPatternsService.get(id);

      const runtimeField = indexPattern.getRuntimeField(name);

      if (!runtimeField) {
        throw new ErrorIndexPatternFieldNotFound(id, name);
      }

      // Access the data view fields created for the runtime field
      let dataViewFields: DataViewField[];

      if (runtimeField.type === 'composite') {
        // For "composite" runtime fields we need to look at the "fields"
        dataViewFields = Object.keys(runtimeField.fields!)
          .map((subFieldName) => {
            const fullName = `${name}.${subFieldName}`;
            return indexPattern.fields.getByName(fullName);
          })
          .filter(Boolean) as DataViewField[];
      } else {
        dataViewFields = [indexPattern.fields.getByName(name)].filter(Boolean) as DataViewField[];
      }

      return res.ok({
        body: {
          // New API for 7.16 & 8.x. Return an Array of DataViewFields for the runtime field
          fields: dataViewFields,
          // @deprecated
          // To avoid creating a breaking change in 7.16 we continue to support
          // the old "field" in the response
          field: dataViewFields[0].toSpec(),
          runtimeField,
        },
      });
    })
  );
};
