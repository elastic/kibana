/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateVersion } from '@kbn/object-versioning-utils';

import type { ContentTypeDefinition } from './content_type_definition';
import { ContentType } from './content_type';

export class ContentTypeRegistry {
  private readonly types: Map<string, ContentType> = new Map();

  public register(definition: ContentTypeDefinition): ContentType {
    if (this.types.has(definition.id)) {
      throw new Error(`Content type with id "${definition.id}" already registered.`);
    }

    const { result, value } = validateVersion(definition.version?.latest);
    if (!result) {
      throw new Error(`Invalid version [${definition.version?.latest}]. Must be an integer.`);
    }

    if (value < 1) {
      throw new Error(`Version must be >= 1`);
    }

    const type = new ContentType({
      ...definition,
      version: { ...definition.version, latest: value },
    });
    this.types.set(type.id, type);

    return type;
  }

  public get(id: string): ContentType | undefined {
    return this.types.get(id);
  }

  public getAll(): ContentType[] {
    return Array.from(this.types.values());
  }
}
