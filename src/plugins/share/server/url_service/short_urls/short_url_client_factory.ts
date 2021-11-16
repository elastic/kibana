/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { ShortUrlStorage } from './types';
import type { IShortUrlClientFactory, ILocatorClient } from '../../../common/url_service';
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

  /**
   * Locators service.
   */
  locators: ILocatorClient;
}

export interface ServerShortUrlClientFactoryCreateParams {
  savedObjects?: SavedObjectsClientContract;
  storage?: ShortUrlStorage;
}

export class ServerShortUrlClientFactory
  implements IShortUrlClientFactory<ServerShortUrlClientFactoryCreateParams>
{
  constructor(private readonly dependencies: ServerShortUrlClientFactoryDependencies) {}

  public get(params: ServerShortUrlClientFactoryCreateParams): ServerShortUrlClient {
    const storage =
      params.storage ??
      new SavedObjectShortUrlStorage({
        savedObjects: params.savedObjects!,
        savedObjectType: 'url',
      });
    const { currentVersion, locators } = this.dependencies;
    const client = new ServerShortUrlClient({
      storage,
      currentVersion,
      locators,
    });

    return client;
  }
}
