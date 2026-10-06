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
export declare const LEGACY_SHORT_URL_LOCATOR_ID = 'LEGACY_SHORT_URL_LOCATOR';
export interface LegacyShortUrlLocatorParams extends SerializableRecord {
  url: string;
}
export declare class LegacyShortUrlLocatorDefinition
  implements LocatorDefinition<LegacyShortUrlLocatorParams>
{
  readonly id = 'LEGACY_SHORT_URL_LOCATOR';
  getLocation(params: LegacyShortUrlLocatorParams): Promise<KibanaLocation>;
}
