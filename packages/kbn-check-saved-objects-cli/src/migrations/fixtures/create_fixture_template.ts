/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getZodSchemaStructure, isZod } from '@kbn/zod';
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import type { FixtureTemplate, ModelVersionSchemaProperty } from './types';

function hasGetSchemaStructure(
  value: unknown
): value is { getSchemaStructure: () => ModelVersionSchemaProperty[] } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return typeof Reflect.get(value, 'getSchemaStructure') === 'function';
}

export function createFixtureTemplate(modelVersion: SavedObjectsModelVersion): FixtureTemplate {
  let props: ModelVersionSchemaProperty[] = [];
  const createSchema = modelVersion.schemas!.create;

  if (hasGetSchemaStructure(createSchema)) {
    props = createSchema.getSchemaStructure();
  } else if (isZod(createSchema)) {
    props = getZodSchemaStructure(createSchema);
  }

  // Sort props by path length to ensure parent paths are created before nested ones
  props.sort((a, b) => a.path.length - b.path.length);
  const template: Record<string, any> = {};
  for (const { path, type } of props) {
    let current = template;
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (i === path.length - 1) {
        current[segment] = type;
      } else {
        current[segment] = current[segment] || {};
        current = current[segment];
      }
    }
  }
  return template;
}
