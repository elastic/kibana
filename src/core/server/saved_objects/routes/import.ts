/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { extname } from 'path';
import { schema, TypeOf } from '@kbn/config-schema';
import { difference } from 'lodash';
import { IRouter } from '../../http';
import { Logger } from '../../logging';
import { CoreUsageDataSetup } from '../../core_usage_data';
import { SavedObjectConfig } from '../saved_objects_config';
import { SavedObjectsImportError } from '../import';
import { catchAndReturnBoomErrors, createSavedObjectsStreamFromNdJson, renameKeys } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: CoreUsageDataSetup;
  logger: Logger;
}

interface FileStream extends Readable {
  hapi: {
    filename: string;
  };
}

// Remove these once usage is sufficiently low.
const querySchemaDeprecated = {
  createNewCopies: schema.maybe(schema.boolean()),
};

const querySchema = schema.object(
  {
    overwrite: schema.boolean({ defaultValue: false }),
    create_new_copies: schema.maybe(schema.boolean()),
    ...querySchemaDeprecated,
  },
  {
    validate: (object) => {
      if (object.overwrite && (object.createNewCopies || object.create_new_copies)) {
        throw new Error('cannot use [overwrite] with [create_new_copies]');
      }
      if (object.create_new_copies && object.createNewCopies) {
        throw new Error('cannot use both [create_new_copies] and the deprecated [createNewCopies]');
      }
    },
  }
);

type QueryConfigType = TypeOf<typeof querySchema>;

// Need to use a type here due to https://github.com/microsoft/TypeScript/issues/15300
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type QueryParams = {
  create_new_copies?: boolean;
  overwrite: boolean;
};

const renameMap = {
  createNewCopies: 'create_new_copies',
  create_new_copies: 'create_new_copies',
  overwrite: 'overwrite',
} as const;

export const registerImportRoute = (
  router: IRouter,
  { config, coreUsageData, logger }: RouteDependencies
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
        query: querySchema,
        body: schema.object({
          file: schema.stream(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      // Convert deprecated camelCase params to new snake_case params
      const renamedQuery = renameKeys<QueryParams, QueryConfigType>(renameMap, req.query);
      const query = {
        ...renamedQuery,
        create_new_copies: renamedQuery.create_new_copies ?? false,
      };

      const deprecatedQueryParams = difference(Object.keys(req.query), Object.keys(renamedQuery));
      if (deprecatedQueryParams.length) {
        deprecatedQueryParams.forEach((p) => {
          logger.warn(
            `Importing saved objects with the [${p}] query parameter has been deprecated. Please use [${
              renameMap[p as keyof typeof renameMap]
            }] instead.`
          );
        });
      }

      const { getClient, getImporter, typeRegistry } = context.core.savedObjects;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsImport({
          request: req,
          createNewCopies: query.create_new_copies,
          overwrite: query.overwrite,
          usedDeprecatedQueryParams: deprecatedQueryParams.length > 0,
        })
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
          createNewCopies: query.create_new_copies,
          overwrite: query.overwrite,
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
