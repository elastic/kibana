/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentTypeDetails } from './types';
import { ContentType } from './content_type';

export class ContentRegistry {
  private readonly types: Map<string, ContentType> = new Map();

  public register(details: ContentTypeDetails): ContentType {
    if (this.types.has(details.id)) {
      throw new Error(`Content type with id "${details.id}" already registered.`);
    }
    const type = new ContentType(details);
    this.types.set(type.id(), type);

    return type;
  }

  public get(id: string): ContentType | undefined {
    return this.types.get(id);
  }

  public getAll(): ContentType[] {
    return Array.from(this.types.values());
  }
}
