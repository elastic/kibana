/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentCrud } from './crud';
import type { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition } from './types';
export declare class ContentType {
  /** Content definition. */
  private readonly _definition;
  /** Content crud instance. */
  private readonly contentCrud;
  constructor(definition: ContentTypeDefinition, eventBus: EventBus);
  get id(): string;
  get definition(): ContentTypeDefinition<
    ContentStorage<unknown, unknown, import('./types').MSearchConfig<unknown, unknown>>
  >;
  get storage(): ContentStorage<
    unknown,
    unknown,
    import('./types').MSearchConfig<unknown, unknown>
  >;
  get crud(): ContentCrud<unknown>;
  get version(): {
    latest: import('@kbn/object-versioning').Version;
  };
}
