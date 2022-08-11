/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaLocation, LocatorDefinition } from '..';
import { shortUrlAssertValid } from './short_url_assert_valid';

export const LEGACY_SHORT_URL_LOCATOR_ID = 'LEGACY_SHORT_URL_LOCATOR';

export interface LegacyShortUrlLocatorParams extends SerializableRecord {
  url: string;
}

export class LegacyShortUrlLocatorDefinition
  implements LocatorDefinition<LegacyShortUrlLocatorParams>
{
  public readonly id = LEGACY_SHORT_URL_LOCATOR_ID;

  public async getLocation(params: LegacyShortUrlLocatorParams): Promise<KibanaLocation> {
    const { url } = params;

    shortUrlAssertValid(url);

    const match = url.match(/^.*\/app\/([^\/#]+)(.+)$/);

    if (!match) {
      throw new Error('Unexpected URL path.');
    }

    const [, app, path] = match;

    if (!app || !path) {
      throw new Error('Could not parse URL path.');
    }

    return {
      app,
      path,
      state: {},
    };
  }
}
