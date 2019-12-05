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

import Hapi from 'hapi';
import Joi from 'joi';
import stringify from 'json-stable-stringify';
import { SavedObjectsClientContract } from 'src/core/server';
import {
  createPromiseFromStreams,
  createMapStream,
  createConcatStream,
} from '../../../utils/streams';
// Disable lint errors for imports from src/core/server/saved_objects until SavedObjects migration is complete
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getSortedObjectsForExport } from '../../../../core/server/saved_objects';
import { Prerequisites } from './types';

interface ExportRequest extends Hapi.Request {
  pre: {
    savedObjectsClient: SavedObjectsClientContract;
  };
  payload: {
    type?: string[];
    objects?: Array<{
      type: string;
      id: string;
    }>;
    search?: string;
    includeReferencesDeep: boolean;
    excludeExportDetails: boolean;
  };
}

export const createExportRoute = (
  prereqs: Prerequisites,
  server: Hapi.Server,
  supportedTypes: string[]
) => ({
  path: '/api/saved_objects/_export',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      payload: Joi.object()
        .keys({
          type: Joi.array()
            .items(Joi.string().valid(supportedTypes.sort()))
            .single()
            .optional(),
          objects: Joi.array()
            .items({
              type: Joi.string()
                .valid(supportedTypes.sort())
                .required(),
              id: Joi.string().required(),
            })
            .max(server.config().get('savedObjects.maxImportExportSize'))
            .optional(),
          search: Joi.string().optional(),
          includeReferencesDeep: Joi.boolean().default(false),
          excludeExportDetails: Joi.boolean().default(false),
        })
        .xor('type', 'objects')
        .nand('search', 'objects')
        .default(),
    },
    async handler(request: ExportRequest, h: Hapi.ResponseToolkit) {
      const { savedObjectsClient } = request.pre;
      const exportStream = await getSortedObjectsForExport({
        savedObjectsClient,
        types: request.payload.type,
        search: request.payload.search,
        objects: request.payload.objects,
        exportSizeLimit: server.config().get('savedObjects.maxImportExportSize'),
        includeReferencesDeep: request.payload.includeReferencesDeep,
        excludeExportDetails: request.payload.excludeExportDetails,
      });

      const docsToExport: string[] = await createPromiseFromStreams([
        exportStream,
        createMapStream((obj: unknown) => {
          return stringify(obj);
        }),
        createConcatStream([]),
      ]);

      return h
        .response(docsToExport.join('\n'))
        .header('Content-Disposition', `attachment; filename="export.ndjson"`)
        .header('Content-Type', 'application/ndjson');
    },
  },
});
