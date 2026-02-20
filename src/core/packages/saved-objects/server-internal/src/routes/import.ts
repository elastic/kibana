/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import path from 'node:path';
import { extname } from 'path';
import { schema } from '@kbn/config-schema';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsImportError } from '@kbn/core-saved-objects-import-export-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
import { badResponseSchema } from './shared_schemas';
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
        description: `Create sets of Kibana saved objects from a file created by the export API. Saved objects can only be imported into the same version, a newer minor on the same major, or the next major. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.

NOTE: The exported saved objects include \`coreMigrationVersion\` and \`typeMigrationVersion\` metadata. If you store exported saved objects outside of Kibana (for example in NDJSON files) or generate them yourself, you must preserve or include these fields to retain forwards compatibility across Kibana versions.`,
        body: {
          maxBytes: maxImportPayloadBytes,
          output: 'stream',
          accepts: 'multipart/form-data',
        },
        oasOperationObject: () => path.resolve(__dirname, './import.examples.yaml'),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        request: {
          query: schema.object(
            {
              overwrite: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'Overwrites saved objects when they already exist. When used, potential conflict errors are automatically resolved by overwriting the destination object. NOTE: This option cannot be used with the `createNewCopies` option.',
                },
              }),
              createNewCopies: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'Creates copies of saved objects, regenerates each object ID, and resets the origin. When used, potential conflict errors are avoided. NOTE: This option cannot be used with the `overwrite` and `compatibilityMode` options.',
                },
              }),
              compatibilityMode: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'Applies various adjustments to the saved objects that are being imported to maintain compatibility between different Kibana versions. Use this option only if you encounter issues with imported saved objects. NOTE: This option cannot be used with the `createNewCopies` option.',
                },
              }),
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
            file: schema.stream({
              meta: {
                description:
                  'A file exported using the export API. Changing the contents of the exported file in any way before importing it can cause errors, crashes or data loss. NOTE: The `savedObjects.maxImportExportSize` configuration setting limits the number of saved objects which may be included in this file. Similarly, the `savedObjects.maxImportPayloadBytes` setting limits the overall size of the file that can be imported.',
              },
            }),
          }),
        },
        response: {
          200: {
            description: 'Indicates a successful call.',
            bodyContentType: 'application/json',
            body: okResponseSchema,
          },
          400: badResponseSchema(),
        },
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

const okResponseSchema = () =>
  schema.object({
    success: schema.boolean({
      meta: {
        description:
          'Indicates when the import was successfully completed. When set to false, some objects may not have been created. For additional information, refer to the `errors` and `successResults` properties.',
      },
    }),
    successCount: schema.number({
      meta: { description: 'Indicates the number of successfully imported records.' },
    }),
    errors: schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
      meta: {
        description: `Indicates the import was unsuccessful and specifies the objects that failed to import.

NOTE: One object may result in multiple errors, which requires separate steps to resolve. For instance, a \`missing_references\` error and conflict error.`,
      },
    }),
    successResults: schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
      meta: {
        description: `Indicates the objects that are successfully imported, with any metadata if applicable.

NOTE: Objects are created only when all resolvable errors are addressed, including conflicts and missing references. If objects are created as new copies, each entry in the \`successResults\` array includes a \`destinationId\` attribute.`,
      },
    }),
  });
