/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { PermissionsPolicyConfigType } from './permissions_policy';
export declare const securityResponseHeadersSchema: import('@kbn/config-schema').ObjectType<{
  strictTransportSecurity: import('@kbn/config-schema').Type<string | null>;
  xContentTypeOptions: import('@kbn/config-schema').Type<'nosniff' | null>;
  referrerPolicy: import('@kbn/config-schema').Type<
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
    | null
  >;
  permissionsPolicy: import('@kbn/config-schema').Type<string | null>;
  permissionsPolicyReportOnly: import('@kbn/config-schema').Type<string | null | undefined>;
  disableEmbedding: import('@kbn/config-schema').Type<boolean>;
  crossOriginOpenerPolicy: import('@kbn/config-schema').Type<
    'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' | null
  >;
}>;
/**
 * Parses raw security header config info, returning an object with the appropriate header keys and values.
 *
 * @param raw
 * @internal
 */
export declare function parseRawSecurityResponseHeadersConfig(
  raw: TypeOf<typeof securityResponseHeadersSchema>,
  rawPermissionsPolicyConfig: PermissionsPolicyConfigType
): {
  securityResponseHeaders: Record<string, string | string[]>;
  disableEmbedding: boolean;
};
