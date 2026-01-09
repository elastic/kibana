/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import type { FixtureTemplate, ModelVersionSchemaProperty } from './types';

export function createFixtureTemplate(modelVersion: SavedObjectsModelVersion): FixtureTemplate {
  const props = modelVersion.schemas!.create!.getSchemaStructure() as ModelVersionSchemaProperty[];

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
