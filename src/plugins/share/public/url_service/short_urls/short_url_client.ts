/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse as parseUrl } from 'url';
import type { SerializableRecord } from '@kbn/utility-types';
import {
  LegacyShortUrlLocatorParams,
  LEGACY_SHORT_URL_LOCATOR_ID,
} from '../../../common/url_service/locators/legacy_short_url_locator';
import {
  SHORT_URL_REDIRECT_LOCATOR,
  ShortUrlRedirectLocatorParams,
} from '../../../common/url_service/locators/short_url_redirect_locator';
import type {
  IShortUrlClient,
  ShortUrl,
  ShortUrlCreateParams,
  ILocatorClient,
  ShortUrlData,
  LocatorPublic,
} from '../../../common/url_service';

export interface BrowserShortUrlClientHttp {
  basePath: {
    get: () => string;
  };
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

  public async createWithLocator<P extends SerializableRecord>(
    params: ShortUrlCreateParams<P>
  ): Promise<ShortUrlCreateResponse<P>> {
    const result = await this.create(params);
    const redirectLocator = this.dependencies.locators.get<ShortUrlRedirectLocatorParams>(
      SHORT_URL_REDIRECT_LOCATOR
    )!;
    const redirectParams: ShortUrlRedirectLocatorParams = {
      slug: result.data.slug,
    };

    return {
      ...result,
      locator: redirectLocator,
      params: redirectParams,
    };
  }

  public async createFromLongUrl(longUrl: string): Promise<ShortUrlCreateFromLongUrlResponse> {
    const parsedUrl = parseUrl(longUrl);

    if (!parsedUrl || !parsedUrl.path) {
      throw new Error(`Invalid URL: ${longUrl}`);
    }

    const path = parsedUrl.path.replace(this.dependencies.http.basePath.get(), '');
    const hash = parsedUrl.hash ? parsedUrl.hash : '';
    const relativeUrl = path + hash;
    const locator = this.dependencies.locators.get<LegacyShortUrlLocatorParams>(
      LEGACY_SHORT_URL_LOCATOR_ID
    );

    if (!locator) {
      throw new Error(`Locator "${LEGACY_SHORT_URL_LOCATOR_ID}" not found`);
    }

    const result = await this.createWithLocator({
      locator,
      humanReadableSlug: true,
      params: {
        url: relativeUrl,
      },
    });
    const shortUrl = await result.locator.getUrl(result.params, { absolute: true });

    return {
      ...result,
      url: shortUrl,
    };
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

export interface ShortUrlCreateResponse<
  LocatorParams extends SerializableRecord = SerializableRecord
> extends ShortUrl<LocatorParams> {
  locator: LocatorPublic<ShortUrlRedirectLocatorParams>;
  params: ShortUrlRedirectLocatorParams;
}

export interface ShortUrlCreateFromLongUrlResponse
  extends ShortUrlCreateResponse<LegacyShortUrlLocatorParams> {
  url: string;
}
