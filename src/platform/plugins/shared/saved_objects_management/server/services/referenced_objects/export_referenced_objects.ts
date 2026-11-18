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
  SavedObjectsExportResultDetails,
  SavedObjectTypeIdTuple,
} from '@kbn/core/server';
import { createConcatStream, createPromiseFromStreams } from '@kbn/utils';
import { prettifyError } from '@kbn/zod';
import type { ApiBodyRegistry } from '../api_body_registry';
import type { ExportReferencedObjectsResponse } from '../../../common/referenced_objects_schemas';

type ExportProblem = ExportReferencedObjectsResponse['problems'][number];

const toKey = ({ type, id }: SavedObjectTypeIdTuple): string => `${type}:${id}`;

const isExportDetails = (
  item: SavedObject | SavedObjectsExportResultDetails
): item is SavedObjectsExportResultDetails => 'exportedCount' in item;

const getRootsByKey = (
  roots: SavedObjectTypeIdTuple[],
  savedObjects: SavedObject[]
): Map<string, string[]> => {
  const referencesByKey = new Map(
    savedObjects.map(({ type, id, references }) => [toKey({ type, id }), references])
  );
  const rootsByKey = new Map<string, string[]>();
  roots.forEach((root) => {
    const reached = new Set([toKey(root)]);
    const queue = [toKey(root)];
    for (let key = queue.shift(); key !== undefined; key = queue.shift()) {
      rootsByKey.set(key, [...(rootsByKey.get(key) ?? []), root.id]);
      (referencesByKey.get(key) ?? []).forEach((reference) => {
        const referenceKey = toKey(reference);
        if (reached.has(referenceKey)) return;
        reached.add(referenceKey);
        queue.push(referenceKey);
      });
    }
  });
  return rootsByKey;
};

/** Exports roots and every object they reach as PUT bodies; throws core's export errors and 403s. */
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
    includeReferencesDeep: true,
  });
  const exported: Array<SavedObject | SavedObjectsExportResultDetails> =
    await createPromiseFromStreams([stream, createConcatStream([])]);
  const savedObjects = exported.filter((item): item is SavedObject => !isExportDetails(item));
  const missingReferences = exported.find(isExportDetails)?.missingReferences ?? [];

  const rootsByKey = getRootsByKey(roots, savedObjects);
  const result: ExportReferencedObjectsResponse = { objects: [], problems: [] };
  const addProblem = (
    { type, id }: SavedObjectTypeIdTuple,
    reason: ExportProblem['reason'],
    message: string
  ): void => {
    result.problems.push({
      type,
      id,
      reason,
      message,
      roots: rootsByKey.get(toKey({ type, id })) ?? [],
    });
  };

  missingReferences.forEach((reference) =>
    addProblem(
      reference,
      'not_found',
      `Saved object [${reference.type}/${reference.id}] is referenced but doesn't exist.`
    )
  );

  for (const { type, id, attributes, references } of savedObjects) {
    const entry = registry.get(type);
    if (!entry) {
      addProblem(
        { type, id },
        'unsupported_type',
        `Saved objects of type [${type}] can't be exported.`
      );
      continue;
    }

    let converted: ReturnType<typeof entry.toApi>;
    try {
      converted = entry.toApi({ attributes, references });
    } catch (e) {
      addProblem({ type, id }, 'transform_failed', e.message);
      continue;
    }

    const parsed = entry.getSchema().safeParse(converted.body);
    if (!parsed.success) {
      addProblem({ type, id }, 'invalid_body', prettifyError(parsed.error));
      continue;
    }

    result.objects.push({ type, id, data: { ...converted.body } });
    converted.warnings.forEach(({ message }) =>
      addProblem({ type, id }, 'dropped_content', message)
    );
  }
  return result;
};
