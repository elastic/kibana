/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { IShortUrlClient, ShortUrl, ShortUrlCreateParams } from '../../../common/url_service';
import type { ShortUrlStorage } from './types';

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

  public async create<P extends SerializableState>({
    locator,
    params,
    slug = '',
  }: ShortUrlCreateParams<P>): Promise<ShortUrl<P>> {
    const { storage, currentVersion } = this.dependencies;
    const now = Date.now();
    const data = await storage.create({
      accessCount: 0,
      accessDate: now,
      createDate: now,
      slug,
      locator: {
        id: locator.id,
        version: currentVersion,
        state: params,
      },
    });

    return {
      data,
    };
  }

  public async delete(slug: string): Promise<boolean> {
    throw new Error('not implemented');
  }

  public async get(slug: string): Promise<ShortUrl> {
    throw new Error('not implemented');
  }
}
