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
import { InternalCoreUsageDataSetup } from '../../core_usage_data';
import { SavedObjectConfig } from '../saved_objects_config';
import { SavedObjectsImportError } from '../import';
import { catchAndReturnBoomErrors, createSavedObjectsStreamFromNdJson } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
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
  const { maxImportPayloadBytes } = config;

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
    catchAndReturnBoomErrors(async (context, req, res) => {
      const { overwrite, createNewCopies } = req.query;
      const { getClient, getImporter, typeRegistry } = (await context.core).savedObjects;

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

      const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((t) => t.name);

      const includedHiddenTypes = supportedTypes.filter((supportedType) =>
        typeRegistry.isHidden(supportedType)
      );

      const client = getClient({ includedHiddenTypes });
      const importer = getImporter(client);

      try {
        const result = await importer.import({
          readStream,
          overwrite,
          createNewCopies,
        });

        return res.ok({ body: result });
      } catch (e) {
        if (e instanceof SavedObjectsImportError) {
          return res.badRequest({
            body: {
              message: e.message,
              attributes: e.attributes,
            },
          });
        }
        throw e;
      }
    })
  );
};
