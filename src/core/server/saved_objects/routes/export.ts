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
import stringify from 'json-stable-stringify';
import {
  createPromiseFromStreams,
  createMapStream,
  createConcatStream,
} from '../../../../legacy/utils/streams';
import { IRouter } from '../../http';
import { SavedObjectConfig } from '../saved_objects_config';
import { getSortedObjectsForExport } from '../export';

export const registerExportRoute = (
  router: IRouter,
  config: SavedObjectConfig,
  supportedTypes: string[]
) => {
  const { maxImportExportSize } = config;

  const typeSchema = schema.string({
    validate: (type: string) => {
      if (!supportedTypes.includes(type)) {
        return `${type} is not exportable`;
      }
    },
  });

  router.post(
    {
      path: '/_export',
      validate: {
        body: schema.object({
          type: schema.maybe(schema.oneOf([typeSchema, schema.arrayOf(typeSchema)])),
          objects: schema.maybe(
            schema.arrayOf(
              schema.object({
                type: typeSchema,
                id: schema.string(),
              }),
              { maxSize: maxImportExportSize }
            )
          ),
          search: schema.maybe(schema.string()),
          includeReferencesDeep: schema.boolean({ defaultValue: false }),
          excludeExportDetails: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const { type, objects, search, excludeExportDetails, includeReferencesDeep } = req.body;
      const exportStream = await getSortedObjectsForExport({
        savedObjectsClient,
        types: typeof type === 'string' ? [type] : type,
        search,
        objects,
        exportSizeLimit: maxImportExportSize,
        includeReferencesDeep,
        excludeExportDetails,
      });

      const docsToExport: string[] = await createPromiseFromStreams([
        exportStream,
        createMapStream((obj: unknown) => {
          return stringify(obj);
        }),
        createConcatStream([]),
      ]);

      return res.ok({
        body: docsToExport.join('\n'),
        headers: {
          'Content-Disposition': `attachment; filename="export.ndjson"`,
          'Content-Type': 'application/ndjson',
        },
      });
    })
  );
};
