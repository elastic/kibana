/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { extname } from 'path';
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';
import { importSavedObjectsFromStream } from '../import';
import { SavedObjectConfig } from '../saved_objects_config';
import { createSavedObjectsStreamFromNdJson } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: CoreUsageDataSetup;
}

interface FileStream extends Readable {
  hapi: {
    filename: string;
  };
}

export const registerImportRoute = (
  router: IRouter,
  { config, coreUsageData }: RouteDependencies
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
        query: schema.object(
          {
            overwrite: schema.boolean({ defaultValue: false }),
            createNewCopies: schema.boolean({ defaultValue: false }),
          },
          {
            validate: (object) => {
              if (object.overwrite && object.createNewCopies) {
                return 'cannot use [overwrite] with [createNewCopies]';
              }
            },
          }
        ),
        body: schema.object({
          file: schema.stream(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { overwrite, createNewCopies } = req.query;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsImport({ request: req, createNewCopies, overwrite })
        .catch(() => {});

      const file = req.body.file as FileStream;
      const fileExtension = extname(file.hapi.filename).toLowerCase();
      if (fileExtension !== '.ndjson') {
        return res.badRequest({ body: `Invalid file extension ${fileExtension}` });
      }

      let readStream: Readable;
      try {
        readStream = await createSavedObjectsStreamFromNdJson(file);
      } catch (e) {
        return res.badRequest({
          body: e,
        });
      }

      const result = await importSavedObjectsFromStream({
        savedObjectsClient: context.core.savedObjects.client,
        typeRegistry: context.core.savedObjects.typeRegistry,
        readStream,
        objectLimit: maxImportExportSize,
        overwrite,
        createNewCopies,
      });

      return res.ok({ body: result });
    })
  );
};
