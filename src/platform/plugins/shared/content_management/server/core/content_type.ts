/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentStorage, ContentTypeDefinition } from './types';

export class ContentType {
  /** Content definition. */
  private readonly _definition: ContentTypeDefinition<ContentStorage>;
  /** Content crud instance. */
  private readonly contentCrud: ContentCrud;

  constructor(definition: ContentTypeDefinition, eventBus: EventBus) {
    this._definition = definition;
    this.contentCrud = new ContentCrud(definition.id, definition.storage, { eventBus });
  }

  public get id() {
    return this._definition.id;
  }

  public get definition() {
    return this._definition;
  }

  public get storage() {
    return this._definition.storage;
  }

  public get crud() {
    return this.contentCrud;
  }

  public get version() {
    return this._definition.version;
  }
}
