/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClient } from 'kibana/server';
import type { IShortUrlClientFactory } from '../../../common/url_service';
import { ServerShortUrlClient } from './short_url_client';
import { SavedObjectShortUrlStorage } from './storage/saved_object_short_url_storage';

/**
 * Dependencies of the Short URL Client factory.
 */
export interface ServerShortUrlClientFactoryDependencies {
  /**
   * Current version of Kibana, e.g. 7.15.0.
   */
  currentVersion: string;
}

export interface ServerShortUrlClientFactoryCreateParams {
  savedObjects: SavedObjectsClient;
}

export class ServerShortUrlClientFactory
  implements IShortUrlClientFactory<ServerShortUrlClientFactoryCreateParams> {
  constructor(private readonly dependencies: ServerShortUrlClientFactoryDependencies) {}

  public get({ savedObjects }: ServerShortUrlClientFactoryCreateParams): ServerShortUrlClient {
    const storage = new SavedObjectShortUrlStorage({
      savedObjects,
      savedObjectType: 'url',
    });
    const client = new ServerShortUrlClient({
      storage,
      currentVersion: this.dependencies.currentVersion,
    });

    return client;
  }
}
