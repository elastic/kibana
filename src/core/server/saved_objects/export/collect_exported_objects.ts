/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '../../../types';
import type { KibanaRequest } from '../../http';
import { SavedObjectsClientContract } from '../types';
import type { SavedObjectsExportTransform } from './types';
import { applyExportTransforms } from './apply_export_transforms';

interface CollectExportedObjectOptions {
  savedObjectsClient: SavedObjectsClientContract;
  objects: SavedObject[];
  /** flag to also include all related saved objects in the export stream. */
  includeReferences?: boolean;
  /** optional namespace to override the namespace used by the savedObjectsClient. */
  namespace?: string;
  /** The http request initiating the export. */
  request: KibanaRequest;
  /** export transform per type */
  exportTransforms: Record<string, SavedObjectsExportTransform>;
}

interface CollectExportedObjectResult {
  objects: SavedObject[];
  missingRefs: CollectedReference[];
}

export const collectExportedObjects = async ({
  objects,
  includeReferences = true,
  namespace,
  request,
  exportTransforms,
  savedObjectsClient,
}: CollectExportedObjectOptions): Promise<CollectExportedObjectResult> => {
  const collectedObjects: SavedObject[] = [];
  const collectedMissingRefs: CollectedReference[] = [];
  const alreadyProcessed: Set<string> = new Set();

  let currentObjects = objects;
  do {
    const transformed = (
      await applyExportTransforms({
        request,
        objects: currentObjects,
        transforms: exportTransforms,
      })
    ).filter((object) => !alreadyProcessed.has(objKey(object)));

    transformed.forEach((obj) => alreadyProcessed.add(objKey(obj)));
    collectedObjects.push(...transformed);

    if (includeReferences) {
      const references = collectReferences(transformed, alreadyProcessed);
      if (references.length) {
        const { objects: fetchedObjects, missingRefs } = await fetchReferences({
          references,
          namespace,
          client: savedObjectsClient,
        });
        collectedMissingRefs.push(...missingRefs);
        currentObjects = fetchedObjects;
      } else {
        currentObjects = [];
      }
    } else {
      currentObjects = [];
    }
  } while (includeReferences && currentObjects.length);

  return {
    objects: collectedObjects,
    missingRefs: collectedMissingRefs,
  };
};

const objKey = (obj: { type: string; id: string }) => `${obj.type}:${obj.id}`;

type ObjectKey = string;

interface CollectedReference {
  id: string;
  type: string;
}

const collectReferences = (
  objects: SavedObject[],
  alreadyProcessed: Set<ObjectKey>
): CollectedReference[] => {
  const references: Map<string, CollectedReference> = new Map();
  objects.forEach((obj) => {
    obj.references?.forEach((ref) => {
      const refKey = objKey(ref);
      if (!alreadyProcessed.has(refKey)) {
        references.set(refKey, { type: ref.type, id: ref.id });
      }
    });
  });
  return [...references.values()];
};

interface FetchReferencesResult {
  objects: SavedObject[];
  missingRefs: CollectedReference[];
}

const fetchReferences = async ({
  references,
  client,
  namespace,
}: {
  references: CollectedReference[];
  client: SavedObjectsClientContract;
  namespace?: string;
}): Promise<FetchReferencesResult> => {
  const { saved_objects: savedObjects } = await client.bulkGet(references, { namespace });
  return {
    objects: savedObjects.filter((obj) => !obj.error),
    missingRefs: savedObjects
      .filter((obj) => obj.error)
      .map((obj) => ({ type: obj.type, id: obj.id })),
  };
};
