/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentTypeDefinition } from './content_type_definition';
import { ContentType } from './content_type';
import { validateVersion } from '../../common/utils';

export class ContentTypeRegistry {
  private readonly types: Map<string, ContentType> = new Map();

  public register(definition: ContentTypeDefinition): ContentType {
    if (this.types.has(definition.id)) {
      throw new Error(`Content type with id "${definition.id}" already registered.`);
    }

    validateVersion(definition.version?.latest);

    const type = new ContentType(definition);
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
