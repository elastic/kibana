/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, SavedObject, SavedObjectsClientContract } from 'kibana/server';
import { SerializableState } from 'src/plugins/kibana_utils/common';
import { LocatorPublic } from '../../../common';
import { IShortUrlClient, ShortUrl } from '../../../common/url_service/short_urls';
import { ShortUrlSavedObjectAttributes } from './types';

export type ShortUrlSavedObject = SavedObject<ShortUrlSavedObjectAttributes>;

export interface ServerShortUrlClientDependencies {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

export class ServerShortUrlClient implements IShortUrlClient {
  constructor(private readonly deps: ServerShortUrlClientDependencies) {}

  public create<P extends SerializableState>(
    locator: LocatorPublic<P>,
    params: P
  ): Promise<ShortUrl<P>> {
    throw new Error('not implemented');
  }

  public delete(slug: string): Promise<boolean> {
    throw new Error('not implemented');
  }

  public get(slug: string): Promise<ShortUrl> {
    throw new Error('not implemented');
  }
}
