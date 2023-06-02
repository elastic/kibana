/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction } from 'lodash';
import {
  ISavedObjectTypeRegistry,
  SavedObjectsType,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { DEFAULT_NAMESPACE_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  LEGACY_URL_ALIAS_TYPE,
  LegacyUrlAlias,
} from '@kbn/core-saved-objects-base-server-internal';
import { Logger } from '@kbn/logging';
import { migrations as coreMigrationsMap } from './migrations';
import { type Transform, TransformType } from './types';
import { convertMigrationFunction } from './utils';

/**
 * Returns all available core transforms for all object types.
 */
export function getCoreTransforms({
  type,
  log,
}: {
  type: SavedObjectsType;
  log: Logger;
}): Transform[] {
  return Object.entries(coreMigrationsMap).map<Transform>(([version, transform]) => ({
    version,
    deferred: !isFunction(transform) && !!transform.deferred,
    transform: convertMigrationFunction(version, type, transform, log),
    transformType: TransformType.Core,
  }));
}

/**
 * Returns all applicable conversion transforms for a given object type.
 */
export function getConversionTransforms(type: SavedObjectsType): Transform[] {
  const { convertToMultiNamespaceTypeVersion } = type;
  if (!convertToMultiNamespaceTypeVersion) {
    return [];
  }
  return [
    {
      version: convertToMultiNamespaceTypeVersion,
      transform: convertNamespaceType,
      transformType: TransformType.Convert,
    },
  ];
}

/**
 * Returns all applicable reference transforms for all object types.
 */
export function getReferenceTransforms(typeRegistry: ISavedObjectTypeRegistry): Transform[] {
  const transformMap = typeRegistry
    .getAllTypes()
    .filter((type) => type.convertToMultiNamespaceTypeVersion)
    .reduce((acc, { convertToMultiNamespaceTypeVersion: version, name }) => {
      const types = acc.get(version!) ?? new Set();
      return acc.set(version!, types.add(name));
    }, new Map<string, Set<string>>());

  return Array.from(transformMap, ([version, types]) => ({
    version,
    transform: (doc) => {
      const { namespace, references } = doc;
      if (namespace && references?.length) {
        return {
          transformedDoc: {
            ...doc,
            references: references.map(({ type, id, ...attrs }) => ({
              ...attrs,
              type,
              id: types.has(type)
                ? SavedObjectsUtils.getConvertedObjectId(namespace, type, id)
                : id,
            })),
          },
          additionalDocs: [],
        };
      }
      return { transformedDoc: doc, additionalDocs: [] };
    },
    transformType: TransformType.Reference,
  }));
}

/**
 * Converts a single-namespace object to a multi-namespace object. This primarily entails removing the `namespace` field and adding the
 * `namespaces` field.
 *
 * If the object does not exist in the default namespace (undefined), its ID is also regenerated, and an "originId" is added to preserve
 * legacy import/copy behavior.
 */
function convertNamespaceType(doc: SavedObjectUnsanitizedDoc) {
  const { namespace, ...otherAttrs } = doc;
  const additionalDocs: SavedObjectUnsanitizedDoc[] = [];

  // If this object exists in the default namespace, return it with the appropriate `namespaces` field without changing its ID.
  if (namespace === undefined) {
    return {
      transformedDoc: { ...otherAttrs, namespaces: [DEFAULT_NAMESPACE_STRING] },
      additionalDocs,
    };
  }

  const { id: originId, type } = otherAttrs;
  const id = SavedObjectsUtils.getConvertedObjectId(namespace, type, originId!);
  const legacyUrlAlias: SavedObjectUnsanitizedDoc<LegacyUrlAlias> = {
    id: `${namespace}:${type}:${originId}`,
    type: LEGACY_URL_ALIAS_TYPE,
    attributes: {
      // NOTE TO MAINTAINERS: If a saved object migration is added in `src/core/server/saved_objects/object_types/registration.ts`, these
      // values must be updated accordingly. That's because a user can upgrade Kibana from 7.17 to 8.x, and any defined migrations will not
      // be applied to aliases that are created during the conversion process.
      sourceId: originId,
      targetNamespace: namespace,
      targetType: type,
      targetId: id,
      purpose: 'savedObjectConversion',
    },
  };
  additionalDocs.push(legacyUrlAlias);
  return {
    transformedDoc: { ...otherAttrs, id, originId, namespaces: [namespace] },
    additionalDocs,
  };
}
