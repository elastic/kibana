/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentTypeDetails, ContentTypeKind } from './types';

export class ContentType {
  constructor(public readonly details: ContentTypeDetails) {}

  id(): string {
    return this.details.id;
  }

  name(): string {
    return this.details.name ?? this.id();
  }

  description(): string {
    return this.details.description ?? '';
  }

  kind(): ContentTypeKind {
    return this.details.kind ?? 'other';
  }

  icon(): string {
    return this.details.icon ?? 'questionInCircle';
  }
}
