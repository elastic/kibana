/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { handleErrors } from '../util/handle_errors';
import { serializedFieldFormatSchema } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../../plugin';

export const registerUpdateFieldsRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}/fields',
      validate: {
        params: schema.object(
          {
            id: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object({
          fields: schema.recordOf(
            schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
            schema.object({
              customLabel: schema.maybe(
                schema.nullable(
                  schema.string({
                    minLength: 1,
                    maxLength: 1_000,
                  })
                )
              ),
              count: schema.maybe(schema.nullable(schema.number())),
              format: schema.maybe(schema.nullable(serializedFieldFormatSchema)),
            })
          ),
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { indexPatterns }] = await getStartServices();
        const indexPatternsService = await indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient
        );
        const id = req.params.id;
        const { fields } = req.body;
        const fieldNames = Object.keys(fields);

        if (fieldNames.length < 1) {
          throw new Error('No fields provided.');
        }

        const indexPattern = await indexPatternsService.get(id);

        let changeCount = 0;
        for (const fieldName of fieldNames) {
          const field = fields[fieldName];

          if (field.customLabel !== undefined) {
            changeCount++;
            indexPattern.setFieldCustomLabel(fieldName, field.customLabel);
          }

          if (field.count !== undefined) {
            changeCount++;
            indexPattern.setFieldCount(fieldName, field.count);
          }

          if (field.format !== undefined) {
            changeCount++;
            if (field.format) {
              indexPattern.setFieldFormat(fieldName, field.format);
            } else {
              indexPattern.deleteFieldFormat(fieldName);
            }
          }
        }

        if (changeCount < 1) {
          throw new Error('Change set is empty.');
        }

        await indexPatternsService.updateSavedObject(indexPattern);

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            index_pattern: indexPattern.toSpec(),
          }),
        });
      })
    )
  );
};
