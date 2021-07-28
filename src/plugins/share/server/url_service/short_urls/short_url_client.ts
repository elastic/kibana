/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableState } from 'src/plugins/kibana_utils/common';
import { IShortUrlClient, ShortUrl, ShortUrlCreateParams } from '../../../common/url_service';
import { ShortUrlStorage } from './types';

/**
 * Dependencies of the Short URL Client.
 */
export interface ServerShortUrlClientDependencies {
  /**
   * Current version of Kibana, e.g. 7.15.0.
   */
  currentVersion: string;

  /**
   * Storage provider for short URLs.
   */
  storage: ShortUrlStorage;
}

export class ServerShortUrlClient implements IShortUrlClient {
  constructor(private readonly dependencies: ServerShortUrlClientDependencies) {}

  public create<P extends SerializableState>(
    params: ShortUrlCreateParams<P>
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
