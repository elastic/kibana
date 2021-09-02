/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '../../../types';
import type { KibanaRequest } from '../../http';
import type { Logger } from '../../logging';
import { SavedObjectsClientContract, SavedObjectsExportablePredicate } from '../types';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { getObjKey, ObjectKeyProvider } from '../import/lib';
import type { SavedObjectsExportTransform } from './types';
import { applyExportTransforms } from './apply_export_transforms';

export interface CollectExportedObjectOptions {
  savedObjectsClient: SavedObjectsClientContract;
  objects: SavedObject[];
  /** flag to also include all related saved objects in the export stream. */
  includeReferences?: boolean;
  /** optional namespace to override the namespace used by the savedObjectsClient. */
  namespace?: string;
  /** The http request initiating the export. */
  request: KibanaRequest;
  /** export transform per type */
  typeRegistry: ISavedObjectTypeRegistry;
  /** logger to use to log potential errors */
  logger: Logger;
}

export interface CollectExportedObjectResult {
  objects: SavedObject[];
  excludedObjects: ExcludedObject[];
  missingRefs: CollectedReference[];
}

interface ExcludedObject {
  id: string;
  type: string;
  namespaces?: string[];
  reason: ExclusionReason;
}

interface ObjectMetaFields {
  id: string;
  type: string;
  namespaces?: string[];
}

export type ExclusionReason = 'predicate_error' | 'excluded';

export const collectExportedObjects = async ({
  objects,
  includeReferences = true,
  namespace,
  request,
  typeRegistry,
  savedObjectsClient,
  logger,
}: CollectExportedObjectOptions): Promise<CollectExportedObjectResult> => {
  const exportTransforms = buildTransforms(typeRegistry);
  const isExportable = buildIsExportable(typeRegistry);

  const collectedObjects: SavedObject[] = [];
  const collectedMissingRefs: CollectedReference[] = [];
  const collectedNonExportableObjects: ExcludedObject[] = [];
  const alreadyProcessed: Set<string> = new Set();

  const objKey: ObjectKeyProvider = (obj: ObjectMetaFields) => getObjKey(obj, typeRegistry);

  let currentObjects = objects;
  do {
    currentObjects = currentObjects.filter((object) => !alreadyProcessed.has(objKey(object)));

    // first, evict current objects that are not exportable
    const {
      exportable: untransformedExportableInitialObjects,
      nonExportable: nonExportableInitialObjects,
    } = await splitByExportability(currentObjects, isExportable, logger);
    collectedNonExportableObjects.push(...nonExportableInitialObjects);
    nonExportableInitialObjects.forEach((obj) => alreadyProcessed.add(objKey(obj)));

    // second, apply export transforms to exportable objects
    const transformedObjects = (
      await applyExportTransforms({
        request,
        objects: untransformedExportableInitialObjects,
        transforms: exportTransforms,
      })
    ).filter((object) => !alreadyProcessed.has(objKey(object)));
    transformedObjects.forEach((obj) => alreadyProcessed.add(objKey(obj)));

    // last, evict additional objects that are not exportable
    const { included: exportableInitialObjects, excluded: additionalObjects } = splitByKeys(
      transformedObjects,
      untransformedExportableInitialObjects.map((obj) => objKey(obj)),
      objKey
    );
    const {
      exportable: exportableAdditionalObjects,
      nonExportable: nonExportableAdditionalObjects,
    } = await splitByExportability(additionalObjects, isExportable, logger);
    const allExportableObjects = [...exportableInitialObjects, ...exportableAdditionalObjects];
    collectedNonExportableObjects.push(...nonExportableAdditionalObjects);
    collectedObjects.push(...allExportableObjects);

    // if `includeReferences` is true, recurse on exportable objects' references.
    if (includeReferences) {
      const references = collectReferences(allExportableObjects, alreadyProcessed, objKey);
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
    excludedObjects: collectedNonExportableObjects,
    missingRefs: collectedMissingRefs,
  };
};

interface CollectedReference {
  id: string;
  type: string;
  namespaces?: string[];
}

const collectReferences = (
  objects: SavedObject[],
  alreadyProcessed: Set<string>,
  objKey: ObjectKeyProvider
): CollectedReference[] => {
  const references: Map<string, CollectedReference> = new Map();
  objects.forEach((obj) => {
    obj.references?.forEach((ref) => {
      // we're assuming that the references lives in the same space(s) as the outward object.
      // for single-NS types, it should necessarily be true unless in case of missing refs.
      // for multi-NS types, it should too, except in rare edge cases (such as manually unsharing a referenced object
      // from some of the spaces the outbound objects referencing it are, which we'll consider as missing refs for now).
      const refKey = objKey({ ...ref, namespaces: obj.namespaces });
      if (!alreadyProcessed.has(refKey)) {
        references.set(refKey, { type: ref.type, id: ref.id, namespaces: obj.namespaces });
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

const buildTransforms = (typeRegistry: ISavedObjectTypeRegistry) =>
  typeRegistry.getAllTypes().reduce((transformMap, type) => {
    if (type.management?.onExport) {
      transformMap.set(type.name, type.management.onExport);
    }
    return transformMap;
  }, new Map<string, SavedObjectsExportTransform>());

const buildIsExportable = (
  typeRegistry: ISavedObjectTypeRegistry
): SavedObjectsExportablePredicate<any> => {
  const exportablePerType = typeRegistry.getAllTypes().reduce((exportableMap, type) => {
    if (type.management?.isExportable) {
      exportableMap.set(type.name, type.management.isExportable);
    }
    return exportableMap;
  }, new Map<string, SavedObjectsExportablePredicate>());

  return (obj: SavedObject) => {
    const typePredicate = exportablePerType.get(obj.type);
    return typePredicate ? typePredicate(obj) : true;
  };
};

const splitByExportability = (
  objects: SavedObject[],
  isExportable: SavedObjectsExportablePredicate<any>,
  logger: Logger
) => {
  const exportableObjects: SavedObject[] = [];
  const nonExportableObjects: ExcludedObject[] = [];

  objects.forEach((obj) => {
    try {
      const exportable = isExportable(obj);
      if (exportable) {
        exportableObjects.push(obj);
      } else {
        nonExportableObjects.push({
          id: obj.id,
          type: obj.type,
          namespaces: obj.namespaces,
          reason: 'excluded',
        });
      }
    } catch (e) {
      logger.error(
        `Error invoking "isExportable" for object ${obj.type}:${obj.id}. Error was: ${
          e.stack ?? e.message
        }`
      );
      nonExportableObjects.push({
        id: obj.id,
        type: obj.type,
        reason: 'predicate_error',
      });
    }
  });

  return {
    exportable: exportableObjects,
    nonExportable: nonExportableObjects,
  };
};

const splitByKeys = (objects: SavedObject[], keys: string[], objKey: ObjectKeyProvider) => {
  const included: SavedObject[] = [];
  const excluded: SavedObject[] = [];
  objects.forEach((obj) => {
    if (keys.includes(objKey(obj))) {
      included.push(obj);
    } else {
      excluded.push(obj);
    }
  });
  return {
    included,
    excluded,
  };
};
