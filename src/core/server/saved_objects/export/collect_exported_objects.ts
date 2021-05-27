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
  includeReferences: boolean;
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
  includeReferences,
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
    const transformed = await applyTransforms({
      objects: currentObjects,
      alreadyProcessed,
      exportTransforms,
      request,
    });
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

interface ProcessCurrentLevelOptions {
  objects: SavedObject[];
  alreadyProcessed: Set<string>;
  request: KibanaRequest;
  exportTransforms: Record<string, SavedObjectsExportTransform>;
}

const applyTransforms = async ({
  objects,
  alreadyProcessed,
  exportTransforms,
  request,
}: ProcessCurrentLevelOptions) => {
  const transformed = await applyExportTransforms({
    request,
    objects,
    transforms: exportTransforms,
  });
  // remove potential additions from the hooks that are already included in the export
  return transformed.filter((object) => !alreadyProcessed.has(objKey(object)));
};

type ObjectKey = string;

interface CollectedReference {
  id: string;
  type: string;
}

const collectReferences = (
  objects: SavedObject[],
  alreadyProcessed: Set<ObjectKey>
): CollectedReference[] => {
  const references: CollectedReference[] = [];
  objects.forEach((obj) => {
    obj.references?.forEach((ref) => {
      if (!alreadyProcessed.has(objKey(ref))) {
        references.push({
          type: ref.type,
          id: ref.id,
        });
      }
    });
  });
  return references;
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
