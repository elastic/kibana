/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type {
  IShortUrlClient,
  ShortUrl,
  ShortUrlCreateParams,
  ILocatorClient,
  ShortUrlData,
} from '../../../common/url_service';

export interface BrowserShortUrlClientHttp {
  fetch: <T>(url: string, params: BrowserShortUrlClientHttpFetchParams) => Promise<T>;
}

interface BrowserShortUrlClientHttpFetchParams {
  method: 'GET' | 'POST' | 'DELETE';
  body?: string;
}

/**
 * Dependencies of the Short URL Client.
 */
export interface BrowserShortUrlClientDependencies {
  /**
   * The locators service.
   */
  locators: ILocatorClient;

  /**
   * HTTP client.
   */
  http: BrowserShortUrlClientHttp;
}

export class BrowserShortUrlClient implements IShortUrlClient {
  constructor(private readonly dependencies: BrowserShortUrlClientDependencies) {}

  public async create<P extends SerializableRecord>({
    locator,
    params,
    slug = undefined,
    humanReadableSlug = false,
  }: ShortUrlCreateParams<P>): Promise<ShortUrl<P>> {
    const { http } = this.dependencies;
    const data = await http.fetch<ShortUrlData<P>>('/api/short_url', {
      method: 'POST',
      body: JSON.stringify({
        locatorId: locator.id,
        slug,
        humanReadableSlug,
        params,
      }),
    });

    return { data };
  }

  public async get(id: string): Promise<ShortUrl> {
    const { http } = this.dependencies;
    const data = await http.fetch<ShortUrlData>('/api/short_url/' + id, {
      method: 'GET',
    });

    return { data };
  }

  public async resolve(slug: string): Promise<ShortUrl> {
    const { http } = this.dependencies;
    const data = await http.fetch<ShortUrlData>('/api/short_url/_slug/' + slug, {
      method: 'GET',
    });

    return { data };
  }

  public async delete(id: string): Promise<void> {
    const { http } = this.dependencies;
    await http.fetch('/api/short_url/' + id, {
      method: 'DELETE',
    });
  }
}
