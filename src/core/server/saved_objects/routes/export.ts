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

import { IRouter, KibanaRequest } from '../../http';
import { InternalCoreUsageDataSetup } from '../../core_usage_data';
import { SavedObjectConfig } from '../saved_objects_config';
import {
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportError,
} from '../export';
import { validateTypes, validateObjects, catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
}

type EitherExportOptions = SavedObjectsExportByTypeOptions | SavedObjectsExportByObjectOptions;

interface ExportRawOptions {
  type?: string | string[];
  hasReference?: { id: string; type: string } | Array<{ id: string; type: string }>;
  objects?: Array<{ id: string; type: string }>;
  search?: string;
  includeReferencesDeep: boolean;
  excludeExportDetails: boolean;
}

interface ExportOptions {
  types?: string[];
  hasReference?: Array<{ id: string; type: string }>;
  objects?: Array<{ id: string; type: string }>;
  search?: string;
  includeReferencesDeep: boolean;
  excludeExportDetails: boolean;
}

const cleanOptions = ({
  type,
  objects,
  search,
  hasReference,
  excludeExportDetails,
  includeReferencesDeep,
}: ExportRawOptions): ExportOptions => {
  return {
    types: typeof type === 'string' ? [type] : type,
    search,
    objects,
    hasReference: hasReference && !Array.isArray(hasReference) ? [hasReference] : hasReference,
    excludeExportDetails,
    includeReferencesDeep,
  };
};

const isExportByTypeOptions = (
  options: EitherExportOptions
): options is SavedObjectsExportByTypeOptions => {
  return Boolean((options as SavedObjectsExportByTypeOptions).types);
};

const validateOptions = (
  {
    types,
    objects,
    excludeExportDetails,
    hasReference,
    includeReferencesDeep,
    search,
  }: ExportOptions,
  {
    exportSizeLimit,
    supportedTypes,
    request,
  }: { exportSizeLimit: number; supportedTypes: string[]; request: KibanaRequest }
): EitherExportOptions => {
  const hasTypes = (types?.length ?? 0) > 0;
  const hasObjects = (objects?.length ?? 0) > 0;
  if (!hasTypes && !hasObjects) {
    throw new Error('Either `type` or `objects` are required.');
  }
  if (hasTypes && hasObjects) {
    throw new Error(`Can't specify both "types" and "objects" properties when exporting`);
  }
  if (hasObjects) {
    if (objects!.length > exportSizeLimit) {
      throw new Error(`Can't export more than ${exportSizeLimit} objects`);
    }
    if (typeof search === 'string') {
      throw new Error(`Can't specify both "search" and "objects" properties when exporting`);
    }
    if (hasReference && hasReference.length) {
      throw new Error(`Can't specify both "references" and "objects" properties when exporting`);
    }
    const validationError = validateObjects(objects!, supportedTypes);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      objects: objects!,
      excludeExportDetails,
      includeReferencesDeep,
      request,
    };
  } else {
    const validationError = validateTypes(types!, supportedTypes);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      types: types!,
      hasReference,
      search,
      excludeExportDetails,
      includeReferencesDeep,
      request,
    };
  }
};

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
    catchAndReturnBoomErrors(async (context, req, res) => {
      const cleaned = cleanOptions(req.body);
      const { typeRegistry, getExporter, getClient } = (await context.core).savedObjects;
      const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((t) => t.name);

      let options: EitherExportOptions;
      try {
        options = validateOptions(cleaned, {
          request: req,
          exportSizeLimit: maxImportExportSize,
          supportedTypes,
        });
      } catch (e) {
        return res.badRequest({
          body: e,
        });
      }

      const includedHiddenTypes = supportedTypes.filter((supportedType) =>
        typeRegistry.isHidden(supportedType)
      );

      const client = getClient({ includedHiddenTypes });
      const exporter = getExporter(client);

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsExport({ request: req, types: cleaned.types, supportedTypes })
        .catch(() => {});

      try {
        const exportStream = isExportByTypeOptions(options)
          ? await exporter.exportByTypes(options)
          : await exporter.exportByObjects(options);

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
      } catch (e) {
        if (e instanceof SavedObjectsExportError) {
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
