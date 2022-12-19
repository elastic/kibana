/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CmItem, ContentItemDetails, ContentItemFields } from './types';

export class ContentItem<T = unknown> implements CmItem {
  public readonly fields: Readonly<ContentItemFields>;

  constructor(public readonly details: ContentItemDetails<T>) {
    this.fields = details.fields;
  }

  public getId(): string {
    return this.details.id;
  }

  public getTitle(): string {
    return this.details.fields.title || '';
  }
}
