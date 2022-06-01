/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { HttpStart } from '../http';
import { SavedObjectsClient, SavedObjectsClientContract } from './saved_objects_client';

/**
 * @public
 */
export interface SavedObjectsStart {
  /** {@link SavedObjectsClientContract} */
  client: SavedObjectsClientContract;
}

export class SavedObjectsService implements CoreService<void, SavedObjectsStart> {
  public async setup() {}
  public async start({ http }: { http: HttpStart }): Promise<SavedObjectsStart> {
    return { client: new SavedObjectsClient(http) };
  }
  public async stop() {}
}
