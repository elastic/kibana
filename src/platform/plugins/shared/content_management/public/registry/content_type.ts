/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentTypeDefinition } from './content_type_definition';
import type { CrudClient } from '../crud_client';

export class ContentType {
  constructor(public readonly definition: ContentTypeDefinition) {}

  public get id(): string {
    return this.definition.id;
  }

  public get name(): string {
    return this.definition.name ?? this.id;
  }

  public get description(): string {
    return this.definition.description ?? '';
  }

  public get icon(): string {
    return this.definition.icon ?? 'questionInCircle';
  }

  public get crud(): CrudClient | undefined {
    return this.definition.crud;
  }

  public get version(): ContentTypeDefinition['version'] {
    return this.definition.version;
  }
}
