/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentClient } from './content_client';
import type { ContentTypeRegistry } from './registry';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

export interface ContentManagementPublicSetup {
  registry: Pick<ContentTypeRegistry, 'register'>;
}

export interface ContentManagementPublicStart {
  client: ContentClient;
  registry: Pick<ContentTypeRegistry, 'get' | 'getAll'>;
}
