/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { SavedObjectsStart } from '@kbn/core-saved-objects-browser';
import { SavedObjectsClient } from './saved_objects_client';

/**
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export class SavedObjectsService implements CoreService<void, SavedObjectsStart> {
  public async setup() {}

  public async start({ http }: { http: InternalHttpStart }): Promise<SavedObjectsStart> {
    return { client: new SavedObjectsClient(http) };
  }

  public async stop() {}
}
