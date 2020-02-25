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

import { Readable } from 'stream';
import { extname } from 'path';
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { importSavedObjects } from '../import';
import { SavedObjectConfig } from '../saved_objects_config';
import { createSavedObjectsStreamFromNdJson } from './utils';

interface FileStream extends Readable {
  hapi: {
    filename: string;
  };
}

export const registerImportRoute = (
  router: IRouter,
  config: SavedObjectConfig,
  supportedTypes: string[]
) => {
  const { maxImportExportSize, maxImportPayloadBytes } = config;

  router.post(
    {
      path: '/_import',
      options: {
        body: {
          maxBytes: maxImportPayloadBytes,
          output: 'stream',
          accepts: 'multipart/form-data',
        },
      },
      validate: {
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          file: schema.stream(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { overwrite } = req.query;
      const file = req.body.file as FileStream;
      const fileExtension = extname(file.hapi.filename).toLowerCase();
      if (fileExtension !== '.ndjson') {
        return res.badRequest({ body: `Invalid file extension ${fileExtension}` });
      }

      const result = await importSavedObjects({
        supportedTypes,
        savedObjectsClient: context.core.savedObjects.client,
        readStream: createSavedObjectsStreamFromNdJson(file),
        objectLimit: maxImportExportSize,
        overwrite,
      });

      return res.ok({ body: result });
    })
  );
};
