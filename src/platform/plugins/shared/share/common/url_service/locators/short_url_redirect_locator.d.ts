/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaLocation, LocatorDefinition } from '..';
export declare const SHORT_URL_REDIRECT_LOCATOR = 'SHORT_URL_REDIRECT_LOCATOR';
export interface ShortUrlRedirectLocatorParams extends SerializableRecord {
  slug: string;
}
/**
 * Locator that points to a frontend short URL redirect app by slug.
 */
export declare class ShortUrlRedirectLocatorDefinition
  implements LocatorDefinition<ShortUrlRedirectLocatorParams>
{
  readonly id = 'SHORT_URL_REDIRECT_LOCATOR';
  getLocation(params: ShortUrlRedirectLocatorParams): Promise<KibanaLocation>;
}
