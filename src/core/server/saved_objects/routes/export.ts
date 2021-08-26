/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { difference } from 'lodash';
import stringify from 'json-stable-stringify';
import { createPromiseFromStreams, createMapStream, createConcatStream } from '@kbn/utils';

import { IRouter, KibanaRequest } from '../../http';
import { Logger } from '../../logging';
import { CoreUsageDataSetup } from '../../core_usage_data';
import { SavedObjectConfig } from '../saved_objects_config';
import {
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportError,
} from '../export';
import { validateTypes, validateObjects, catchAndReturnBoomErrors, renameKeys } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: CoreUsageDataSetup;
  logger: Logger;
}

type EitherExportOptions = SavedObjectsExportByTypeOptions | SavedObjectsExportByObjectOptions;

type ExportRawOptions = TypeOf<ReturnType<typeof generateBodySchema>>;

// Need to use a type here due to https://github.com/microsoft/TypeScript/issues/15300
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ExportOptions = {
  types?: string[];
  objects?: Array<{ id: string; type: string }>;
  search?: string;
  has_reference?: Array<{ id: string; type: string }>;
  include_references_deep: boolean;
  exclude_export_details: boolean;
};

function generateBodySchema({ maxImportExportSize }: { maxImportExportSize: number }) {
  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });

  // Remove these once usage is sufficiently low.
  const bodySchemaDeprecated = {
    hasReference: schema.maybe(schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])),
    includeReferencesDeep: schema.maybe(schema.boolean()),
    excludeExportDetails: schema.maybe(schema.boolean()),
  };

  return schema.object(
    {
      type: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
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
      has_reference: schema.maybe(schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])),
      include_references_deep: schema.maybe(schema.boolean()),
      exclude_export_details: schema.maybe(schema.boolean()),
      ...bodySchemaDeprecated,
    },
    {
      validate: (object) => {
        if (object.has_reference && object.hasReference) {
          throw new Error('cannot use both [has_reference] and the deprecated [hasReference]');
        }
        if (object.include_references_deep && object.includeReferencesDeep) {
          throw new Error(
            'cannot use both [include_references_deep] and the deprecated [includeReferencesDeep]'
          );
        }
        if (object.exclude_export_details && object.excludeExportDetails) {
          throw new Error(
            'cannot use both [exclude_export_details] and the deprecated [excludeExportDetails]'
          );
        }
      },
    }
  );
}

const renameMap = {
  type: 'types',
  types: 'types',
  search: 'search',
  objects: 'objects',
  has_reference: 'has_reference',
  hasReference: 'has_reference',
  exclude_export_details: 'exclude_export_details',
  excludeExportDetails: 'exclude_export_details',
  include_references_deep: 'include_references_deep',
  includeReferencesDeep: 'include_references_deep',
} as const;

const cleanOptions = (body: ExportRawOptions, { logger }: { logger: Logger }): ExportOptions => {
  const types = typeof body.type === 'string' ? [body.type] : body.type;

  // Convert deprecated camelCase params to new snake_case params
  const renamedBody = renameKeys<ExportOptions, ExportRawOptions>(renameMap, body);

  const {
    objects,
    search,
    has_reference, // eslint-disable-line @typescript-eslint/naming-convention
    include_references_deep, // eslint-disable-line @typescript-eslint/naming-convention
    exclude_export_details, // eslint-disable-line @typescript-eslint/naming-convention
  } = renamedBody;

  return {
    types,
    objects,
    search,
    has_reference: has_reference && !Array.isArray(has_reference) ? [has_reference] : has_reference,
    include_references_deep: include_references_deep ?? false,
    exclude_export_details: exclude_export_details ?? false,
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
    exclude_export_details, // eslint-disable-line @typescript-eslint/naming-convention
    has_reference, // eslint-disable-line @typescript-eslint/naming-convention
    include_references_deep, // eslint-disable-line @typescript-eslint/naming-convention
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
    if (has_reference && has_reference.length) {
      throw new Error(`Can't specify both "references" and "objects" properties when exporting`);
    }
    const validationError = validateObjects(objects!, supportedTypes);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      objects: objects!,
      excludeExportDetails: exclude_export_details,
      includeReferencesDeep: include_references_deep,
      request,
    };
  } else {
    const validationError = validateTypes(types!, supportedTypes);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      types: types!,
      hasReference: has_reference,
      search,
      excludeExportDetails: exclude_export_details,
      includeReferencesDeep: include_references_deep,
      request,
    };
  }
};

export const registerExportRoute = (
  router: IRouter,
  { config, coreUsageData, logger }: RouteDependencies
) => {
  const { maxImportExportSize } = config;

  router.post(
    {
      path: '/_export',
      validate: {
        body: generateBodySchema({ maxImportExportSize }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const cleaned = cleanOptions(req.body, { logger });
      const { typeRegistry, getExporter, getClient } = context.core.savedObjects;
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

      const deprecatedKeys = difference(
        Object.keys(req.body).filter((k) => k !== 'type'),
        Object.keys(cleaned)
      );
      if (deprecatedKeys.length) {
        deprecatedKeys.forEach((p) => {
          logger.warn(
            `Exporting saved objects with [${p}] has been deprecated. Please use [${
              renameMap[p as keyof typeof renameMap]
            }] instead.`
          );
        });
      }

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsExport({
          request: req,
          types: cleaned.types,
          supportedTypes,
          usedDeprecatedBodyFields: deprecatedKeys.length > 0,
        })
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
