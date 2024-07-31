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
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsImportError } from '@kbn/core-saved-objects-import-export-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
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
  router: InternalSavedObjectRouter,
  { config, coreUsageData }: RouteDependencies
) => {
  const { maxImportPayloadBytes } = config;

  router.post(
    {
      path: '/_import',
      options: {
        summary: `Import saved objects`,
        tags: ['oas-tag:saved objects'],
        access: 'public',
        description:
          'Create sets of Kibana saved objects from a file created by the export API. Saved objects can only be imported into the same version, a newer minor on the same major, or the next major. Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.',
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
            compatibilityMode: schema.boolean({ defaultValue: false }),
          },
          {
            validate: (object) => {
              if (object.overwrite && object.createNewCopies) {
                return 'cannot use [overwrite] with [createNewCopies]';
              }

              if (object.createNewCopies && object.compatibilityMode) {
                return 'cannot use [createNewCopies] with [compatibilityMode]';
              }
            },
          }
        ),
        body: schema.object({
          file: schema.stream(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      const { overwrite, createNewCopies, compatibilityMode } = request.query;
      const { getClient, getImporter, typeRegistry } = (await context.core).savedObjects;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsImport({
          request,
          createNewCopies,
          overwrite,
          compatibilityMode,
        })
        .catch(() => {});

      const file = request.body.file as FileStream;
      const fileExtension = extname(file.hapi.filename).toLowerCase();
      if (fileExtension !== '.ndjson') {
        return response.badRequest({ body: `Invalid file extension ${fileExtension}` });
      }

      let readStream: Readable;
      try {
        readStream = await createSavedObjectsStreamFromNdJson(file);
      } catch (e) {
        return response.badRequest({
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
          compatibilityMode,
        });

        return response.ok({ body: result });
      } catch (e) {
        if (e instanceof SavedObjectsImportError) {
          return response.badRequest({
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
