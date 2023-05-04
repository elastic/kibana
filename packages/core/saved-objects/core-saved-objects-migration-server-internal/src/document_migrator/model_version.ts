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
} from '@kbn/core-saved-objects-base-server-internal';
import { TransformSavedObjectDocumentError } from '../core';
import { type Transform, type TransformFn, TransformType } from './types';

const noopTransform: TransformFn = (doc) => ({ transformedDoc: doc, additionalDocs: [] });

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

  return Object.entries(modelVersionMap).map<Transform>(([rawModelVersion, definition]) => {
    const modelVersion = assertValidModelVersion(rawModelVersion);
    const virtualVersion = modelVersionToVirtualVersion(modelVersion);
    return {
      version: virtualVersion,
      transform: convertModelVersionTransformFn({
        log,
        modelVersion,
        virtualVersion,
        definition,
        type: 'up',
      }),
      transformDown: convertModelVersionTransformFn({
        log,
        modelVersion,
        virtualVersion,
        definition,
        type: 'down',
      }),
      transformType: TransformType.Migrate,
    };
  });
};

export const convertModelVersionTransformFn = ({
  virtualVersion,
  modelVersion,
  definition,
  type,
  log,
}: {
  virtualVersion: string;
  modelVersion: number;
  definition: SavedObjectsModelVersion;
  type: 'up' | 'down';
  log: Logger;
}): TransformFn => {
  if (!definition.modelChange.transformation) {
    return noopTransform;
  }
  const context: SavedObjectModelTransformationContext = {
    log,
    modelVersion,
  };
  const modelTransformFn =
    type === 'up'
      ? definition.modelChange.transformation.up
      : definition.modelChange.transformation.down;

  return function convertedTransform(doc: SavedObjectUnsanitizedDoc) {
    try {
      const result = modelTransformFn(doc, context);
      return { transformedDoc: result.document, additionalDocs: [] };
    } catch (error) {
      log.error(error);
      throw new TransformSavedObjectDocumentError(error, virtualVersion);
    }
  };
};
