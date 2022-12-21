/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentItem } from './content_item';
import type { ContentTypeDetails, ContentTypeKind } from './types';

export class ContentType<T = unknown> {
  constructor(public readonly details: ContentTypeDetails<T>) {}

  public getId(): string {
    return this.details.id;
  }

  public kind(): ContentTypeKind {
    return this.details.kind || 'other';
  }

  public async read(id: string): Promise<ContentItem<T>> {
    const typeDetails = this.details;
    if (!typeDetails.operations.read)
      throw new Error(`Content type ${this.getId()} does not support read operation`);
    const itemDetails = await typeDetails.operations.read(id);
    const item = new ContentItem<T>(itemDetails);
    return item;
  }

  public async list(): Promise<Array<ContentItem<T>>> {
    const typeDetails = this.details;
    if (!typeDetails.operations.list)
      throw new Error(`Content type ${this.getId()} does not support list operation`);
    const list = await typeDetails.operations.list();
    const items = list.map((itemDetails) => new ContentItem<T>(itemDetails));
    return items;
  }
}
