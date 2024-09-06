/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/logging';
import type {
  SavedObjectsType,
  SavedObjectsModelVersion,
  SavedObjectModelTransformationContext,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import {
  modelVersionToVirtualVersion,
  assertValidModelVersion,
  buildModelVersionTransformFn,
  convertModelVersionBackwardConversionSchema,
} from '@kbn/core-saved-objects-base-server-internal';
import { TransformSavedObjectDocumentError } from '../core';
import { type Transform, type TransformFn, TransformType, type TypeVersionSchema } from './types';

export const getModelVersionSchemas = ({
  typeDefinition,
}: {
  typeDefinition: SavedObjectsType;
}): Record<string, TypeVersionSchema> => {
  const modelVersionMap =
    typeof typeDefinition.modelVersions === 'function'
      ? typeDefinition.modelVersions()
      : typeDefinition.modelVersions ?? {};

  return Object.entries(modelVersionMap).reduce((map, [rawModelVersion, versionDefinition]) => {
    const schema = versionDefinition.schemas?.forwardCompatibility;
    if (schema) {
      const modelVersion = assertValidModelVersion(rawModelVersion);
      const virtualVersion = modelVersionToVirtualVersion(modelVersion);
      map[virtualVersion] = convertModelVersionBackwardConversionSchema(schema);
    }
    return map;
  }, {} as Record<string, TypeVersionSchema>);
};

/**
 * Note: transforms are only returned for model versions that have at least one change type that transforms documents.
 */
export const getModelVersionTransforms = ({
  typeDefinition,
  log,
}: {
  typeDefinition: SavedObjectsType;
  log: Logger;
}): Transform[] => {
  const modelVersionMap =
    typeof typeDefinition.modelVersions === 'function'
      ? typeDefinition.modelVersions()
      : typeDefinition.modelVersions ?? {};

  return (
    Object.entries(modelVersionMap)
      // Filter out model versions that do not have any change types that transforms documents
      .filter(([rawModelVersion, definition]) => {
        return !definition.changes.every(
          (change) => change.type === 'mappings_addition' || change.type === 'mappings_deprecation'
        );
      })
      .map<Transform>(([rawModelVersion, definition]) => {
        const modelVersion = assertValidModelVersion(rawModelVersion);
        const virtualVersion = modelVersionToVirtualVersion(modelVersion);

        return {
          version: virtualVersion,
          transform: convertModelVersionTransformFn({
            typeDefinition,
            log,
            modelVersion,
            virtualVersion,
            modelVersionDefinition: definition,
          }),
          transformType: TransformType.Migrate,
        };
      })
  );
};

export const convertModelVersionTransformFn = ({
  typeDefinition,
  virtualVersion,
  modelVersion,
  modelVersionDefinition,
  log,
}: {
  typeDefinition: SavedObjectsType;
  virtualVersion: string;
  modelVersion: number;
  modelVersionDefinition: SavedObjectsModelVersion;
  log: Logger;
}): TransformFn => {
  const context: SavedObjectModelTransformationContext = {
    log,
    modelVersion,
    namespaceType: typeDefinition.namespaceType,
  };
  const modelTransformFn = buildModelVersionTransformFn(modelVersionDefinition.changes);

  return function convertedTransform(doc: SavedObjectUnsanitizedDoc) {
    try {
      const result = modelTransformFn(doc, context);
      return { transformedDoc: result.document, additionalDocs: [] };
    } catch (error) {
      log.error(`Error trying to transform document: ${error.message}`);
      throw new TransformSavedObjectDocumentError(error, virtualVersion);
    }
  };
};
