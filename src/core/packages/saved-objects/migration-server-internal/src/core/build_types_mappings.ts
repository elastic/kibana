/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsType,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import {
  getSemanticFieldName,
  resolveSemanticInferenceId,
} from '@kbn/core-saved-objects-base-server-internal';

/**
 * Merge mappings from all registered saved object types, synthesizing shadow `semantic_text`
 * fields for any type that declares {@link SavedObjectsType.semanticSearch}.
 */
export const buildTypesMappings = (
  types: SavedObjectsType[]
): SavedObjectsTypeMappingDefinitions => {
  return types.reduce<SavedObjectsTypeMappingDefinitions>((acc, type) => {
    const { name: typeName, mappings, semanticSearch } = type;
    const duplicate = Object.hasOwn(acc, typeName);
    if (duplicate) {
      throw new Error(`Type ${typeName} is already defined.`);
    }

    if (!semanticSearch) {
      acc[typeName] = mappings;
      return acc;
    }

    // ADR-6 / Mechanism B: emit shadow semantic_text fields alongside the author's mappings.
    // Source field mappings are byte-identical to what the author wrote — no copy_to is added.
    const inferenceId = resolveSemanticInferenceId(type);
    const shadowProperties: SavedObjectsMappingProperties = {};
    for (const field of semanticSearch.fields) {
      shadowProperties[getSemanticFieldName(field)] = {
        type: 'semantic_text',
        inference_id: inferenceId,
      };
    }

    acc[typeName] = {
      ...mappings,
      properties: {
        ...mappings.properties,
        ...shadowProperties,
      },
    };

    return acc;
  }, {});
};
