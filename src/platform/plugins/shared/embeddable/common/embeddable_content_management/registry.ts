/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableContentManagementDefinition } from '..';

export class EmbeddableContentManagementRegistry {
  private registry: Map<string, EmbeddableContentManagementDefinition> = new Map();

  public registerContentManagementDefinition = (
    definition: EmbeddableContentManagementDefinition
  ) => {
    if (this.registry.has(definition.id)) {
      throw new Error(
        `Content management definition for type "${definition.id}" is already registered.`
      );
    }

    if (!(definition.latestVersion in definition.versions)) {
      throw new Error(
        `Content management definition for type "${definition.id}" does not include the current version "${definition.latestVersion}".`
      );
    }
    this.registry.set(definition.id, definition);
  };

  public getContentManagementDefinition = (id: string) => {
    return this.registry.get(id);
  };
}
