/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import stringify from 'json-stable-stringify';
import { createPromiseFromStreams, createMapStream, createConcatStream } from '@kbn/utils';

import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';
import { SavedObjectConfig } from '../saved_objects_config';
import { exportSavedObjectsToStream } from '../export';
import { validateTypes, validateObjects } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: CoreUsageDataSetup;
}

export const registerExportRoute = (
  router: IRouter,
  { config, coreUsageData }: RouteDependencies
) => {
  const { maxImportExportSize } = config;

  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });

  router.post(
    {
      path: '/_export',
      validate: {
        body: schema.object({
          type: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          hasReference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
          ),
          objects: schema.maybe(
            schema.arrayOf(
              schema.object({
                type: schema.string(),
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
      const {
        type,
        hasReference,
        objects,
        search,
        excludeExportDetails,
        includeReferencesDeep,
      } = req.body;
      const types = typeof type === 'string' ? [type] : type;

      // need to access the registry for type validation, can't use the schema for this
      const supportedTypes = context.core.savedObjects.typeRegistry
        .getImportableAndExportableTypes()
        .map((t) => t.name);
      if (types) {
        const validationError = validateTypes(types, supportedTypes);
        if (validationError) {
          return res.badRequest({
            body: {
              message: validationError,
            },
          });
        }
      }
      if (objects) {
        const validationError = validateObjects(objects, supportedTypes);
        if (validationError) {
          return res.badRequest({
            body: {
              message: validationError,
            },
          });
        }
      }

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsExport({ request: req, types, supportedTypes })
        .catch(() => {});

      const exportStream = await exportSavedObjectsToStream({
        savedObjectsClient,
        types,
        hasReference: hasReference && !Array.isArray(hasReference) ? [hasReference] : hasReference,
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
