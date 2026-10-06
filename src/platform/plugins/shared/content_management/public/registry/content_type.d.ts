/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentTypeDefinition } from './content_type_definition';
import type { CrudClient } from '../crud_client';
export declare class ContentType {
  readonly definition: ContentTypeDefinition;
  constructor(definition: ContentTypeDefinition);
  get id(): string;
  get name(): string;
  get description(): string;
  get icon(): string;
  get crud(): CrudClient | undefined;
  get version(): ContentTypeDefinition['version'];
}
