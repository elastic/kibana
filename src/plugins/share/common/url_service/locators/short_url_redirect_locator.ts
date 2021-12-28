/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaLocation, LocatorDefinition } from '../../url_service';

export const SHORT_URL_REDIRECT_LOCATOR = 'SHORT_URL_REDIRECT_LOCATOR';
export const SHORT_URL_REDIRECT_APP = 'short_url_redirect';

export interface ShortUrlRedirectLocatorParams extends SerializableRecord {
  slug: string;
}

/**
 * Locator that points to a frontend short URL redirect app by slug.
 */
export class ShortUrlRedirectLocatorDefinition
  implements LocatorDefinition<ShortUrlRedirectLocatorParams>
{
  public readonly id = SHORT_URL_REDIRECT_LOCATOR;

  public async getLocation(params: ShortUrlRedirectLocatorParams): Promise<KibanaLocation> {
    const { slug } = params;

    return {
      app: SHORT_URL_REDIRECT_APP,
      path: '_slug/' + slug,
      state: {},
    };
  }
}
