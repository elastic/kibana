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

import { schema } from '@kbn/config-schema';
import stringify from 'json-stable-stringify';
import { createPromiseFromStreams, createMapStream, createConcatStream } from '@kbn/utils';

import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';
import { SavedObjectConfig } from '../saved_objects_config';
import {
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportError,
} from '../export';
import { validateTypes, validateObjects } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: CoreUsageDataSetup;
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
  { exportSizeLimit, supportedTypes }: { exportSizeLimit: number; supportedTypes: string[] }
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
    router.handleLegacyErrors(async (context, req, res) => {
      const cleaned = cleanOptions(req.body);
      const supportedTypes = context.core.savedObjects.typeRegistry
        .getImportableAndExportableTypes()
        .map((t) => t.name);
      let options: EitherExportOptions;
      try {
        options = validateOptions(cleaned, {
          exportSizeLimit: maxImportExportSize,
          supportedTypes,
        });
      } catch (e) {
        return res.badRequest({
          body: e,
        });
      }

      const exporter = context.core.savedObjects.exporter;

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
