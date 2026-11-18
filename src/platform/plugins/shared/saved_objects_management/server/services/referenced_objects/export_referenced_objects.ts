/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ISavedObjectsExporter,
  KibanaRequest,
  SavedObject,
  SavedObjectTypeIdTuple,
} from '@kbn/core/server';
import { createConcatStream, createPromiseFromStreams } from '@kbn/utils';
import { prettifyError } from '@kbn/zod';
import type { ApiBodyRegistry } from '../api_body_registry';
import type { ExportReferencedObjectsResponse } from '../../../common/referenced_objects_schemas';

/**
 * Exports roots through core's exporter, as the bodies their public APIs accept on PUT.
 * Throws core's export errors, such as `object-fetch-error` for a missing root.
 */
export const exportReferencedObjects = async ({
  exporter,
  registry,
  request,
  roots,
}: {
  exporter: ISavedObjectsExporter;
  registry: ApiBodyRegistry;
  request: KibanaRequest;
  roots: SavedObjectTypeIdTuple[];
}): Promise<ExportReferencedObjectsResponse> => {
  const stream = await exporter.exportByObjects({
    request,
    objects: roots,
    excludeExportDetails: true,
  });
  const savedObjects: SavedObject[] = await createPromiseFromStreams([
    stream,
    createConcatStream([]),
  ]);

  const result: ExportReferencedObjectsResponse = { objects: [], problems: [] };
  for (const { type, id, attributes, references } of savedObjects) {
    const addProblem = (
      reason: ExportReferencedObjectsResponse['problems'][number]['reason'],
      message: string
    ): void => {
      result.problems.push({ type, id, reason, message, roots: [id] });
    };

    const entry = registry.get(type);
    if (!entry) {
      addProblem('unsupported_type', `Saved objects of type [${type}] can't be exported.`);
      continue;
    }

    let converted: ReturnType<typeof entry.toApi>;
    try {
      converted = entry.toApi({ attributes, references });
    } catch (e) {
      addProblem('transform_failed', e.message);
      continue;
    }

    const parsed = entry.getSchema().safeParse(converted.body);
    if (!parsed.success) {
      addProblem('invalid_body', prettifyError(parsed.error));
      continue;
    }

    result.objects.push({ type, id, data: { ...converted.body } });
    converted.warnings.forEach(({ message }) => addProblem('dropped_content', message));
  }
  return result;
};
