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

import Boom from 'boom';
import Hapi from 'hapi';
import Joi from 'joi';
import { extname } from 'path';
import { Readable } from 'stream';
import { SavedObjectsClientContract } from 'src/core/server';
// Disable lint errors for imports from src/core/server/saved_objects until SavedObjects migration is complete
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { resolveImportErrors } from '../../../../core/server/saved_objects/import';
import { Prerequisites } from './types';
import { createSavedObjectsStreamFromNdJson } from '../lib';

interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

interface ImportRequest extends Hapi.Request {
  pre: {
    savedObjectsClient: SavedObjectsClientContract;
  };
  payload: {
    file: HapiReadableStream;
    retries: Array<{
      type: string;
      id: string;
      overwrite: boolean;
      replaceReferences: Array<{
        type: string;
        from: string;
        to: string;
      }>;
    }>;
  };
}

export const createResolveImportErrorsRoute = (
  prereqs: Prerequisites,
  server: Hapi.Server,
  supportedTypes: string[]
) => ({
  path: '/api/saved_objects/_resolve_import_errors',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    payload: {
      maxBytes: server.config().get('savedObjects.maxImportPayloadBytes'),
      output: 'stream',
      allow: 'multipart/form-data',
    },
    validate: {
      payload: Joi.object({
        file: Joi.object().required(),
        retries: Joi.array()
          .items(
            Joi.object({
              type: Joi.string().required(),
              id: Joi.string().required(),
              overwrite: Joi.boolean().default(false),
              replaceReferences: Joi.array()
                .items(
                  Joi.object({
                    type: Joi.string().required(),
                    from: Joi.string().required(),
                    to: Joi.string().required(),
                  })
                )
                .default([]),
            })
          )
          .required(),
      }).default(),
    },
  },
  async handler(request: ImportRequest) {
    const { savedObjectsClient } = request.pre;
    const { filename } = request.payload.file.hapi;
    const fileExtension = extname(filename).toLowerCase();

    if (fileExtension !== '.ndjson') {
      return Boom.badRequest(`Invalid file extension ${fileExtension}`);
    }

    return await resolveImportErrors({
      supportedTypes,
      savedObjectsClient,
      readStream: createSavedObjectsStreamFromNdJson(request.payload.file),
      retries: request.payload.retries,
      objectLimit: request.server.config().get('savedObjects.maxImportExportSize'),
    });
  },
});
