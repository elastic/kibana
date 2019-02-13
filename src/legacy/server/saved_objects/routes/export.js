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

import Joi from 'joi';
import { getExportDocuments } from '../lib/export';

const EXPORT_SIZE_LIMIT = 10000;

export const createExportRoute = (prereqs) => ({
  path: '/api/saved_objects/_export',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      query: Joi.object()
        .keys({
          type: Joi.array()
            .items(Joi.string())
            .single()
            .optional(),
          objects: Joi.array()
            .items({
              type: Joi.string().required(),
              id: Joi.string().required(),
            })
            .max(EXPORT_SIZE_LIMIT)
            .optional(),
        })
        .default(),
    },
    async handler(request, h) {
      const { savedObjectsClient } = request.pre;
      const types = request.query.type || request.server.savedObjects.types.filter(type => type !== 'space');
      const docsToExport = await getExportDocuments({
        types,
        objects: request.query.objects,
        savedObjectsClient,
        exportSizeLimit: EXPORT_SIZE_LIMIT,
      });
      // Send file to response
      return h
        .response(docsToExport.map(doc => JSON.stringify(doc)).join('\n'))
        .header('Content-Disposition', `attachment; filename="export.ndjson"`);
    },
  },
});
