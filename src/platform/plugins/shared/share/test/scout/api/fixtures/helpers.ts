/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { SerializableRecord } from '@kbn/utility-types';
import type { ShortUrlData } from '../../../../common/url_service';
import { LEGACY_SHORT_URL_LOCATOR_ID, SHORT_URL_API_PATH } from './constants';

export type ShortUrlApiResponse<P extends SerializableRecord = SerializableRecord> =
  ShortUrlData<P> & { readonly url?: string };

interface CreateShortUrlOptions<P extends SerializableRecord> {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  params: P;
  slug?: string;
  track: (id: string) => void;
}

/** Creates and tracks a short URL used to arrange another endpoint test. */
export const createShortUrl = async <P extends SerializableRecord>({
  apiClient,
  headers,
  params,
  slug,
  track,
}: CreateShortUrlOptions<P>): Promise<ShortUrlApiResponse<P>> => {
  const response = await apiClient.post(SHORT_URL_API_PATH, {
    headers,
    responseType: 'json',
    body: {
      locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
      params,
      ...(slug === undefined ? {} : { slug }),
    },
  });

  expect(response).toHaveStatusCode(200);
  const shortUrl = response.body as ShortUrlApiResponse<P>;
  track(shortUrl.id);
  return shortUrl;
};
