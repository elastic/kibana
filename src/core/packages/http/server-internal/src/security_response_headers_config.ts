/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PermissionsPolicyConfigType } from './permissions_policy';
import { addReportToParameter } from './permissions_policy';

export const securityResponseHeadersSchema = schema.object({
  strictTransportSecurity: schema.oneOf([schema.string(), schema.literal(null)], {
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
    defaultValue: null,
  }),
  xContentTypeOptions: schema.oneOf([schema.literal('nosniff'), schema.literal(null)], {
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
    defaultValue: 'nosniff',
  }),
  referrerPolicy: schema.oneOf(
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
    [
      schema.literal('no-referrer'),
      schema.literal('no-referrer-when-downgrade'),
      schema.literal('origin'),
      schema.literal('origin-when-cross-origin'),
      schema.literal('same-origin'),
      schema.literal('strict-origin'),
      schema.literal('strict-origin-when-cross-origin'),
      schema.literal('unsafe-url'),
      schema.literal(null),
    ],
    { defaultValue: 'strict-origin-when-cross-origin' }
  ),
  permissionsPolicy: schema.oneOf([schema.string(), schema.literal(null)], {
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
    // Note: this currently lists all non-experimental permissions, as of May 2023
    // `geolocation` is allowed for `self` because Maps' browser location starting view and the Canvas
    // `location()` function call it. `fullscreen` allows Vidyard so that the videos Security Solution
    // embeds can go fullscreen; core's CSP already allows Vidyard in `frame-src`.
    defaultValue:
      'camera=(), display-capture=(), fullscreen=(self "https://play.vidyard.com"), geolocation=(self), microphone=(), web-share=()',
  }),
  permissionsPolicyReportOnly: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  disableEmbedding: schema.boolean({ defaultValue: false }), // is used to control X-Frame-Options and CSP headers
  crossOriginOpenerPolicy: schema.oneOf(
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
    [
      schema.literal('unsafe-none'),
      schema.literal('same-origin-allow-popups'),
      schema.literal('same-origin'),
      schema.literal(null),
    ],
    { defaultValue: 'same-origin' }
  ),
});

/**
 * Parses raw security header config info, returning an object with the appropriate header keys and values.
 *
 * @param raw
 * @internal
 */
export function parseRawSecurityResponseHeadersConfig(
  raw: TypeOf<typeof securityResponseHeadersSchema>,
  rawPermissionsPolicyConfig: PermissionsPolicyConfigType
) {
  const securityResponseHeaders: Record<string, string | string[]> = {};
  const { disableEmbedding } = raw;

  if (raw.strictTransportSecurity) {
    securityResponseHeaders['Strict-Transport-Security'] = raw.strictTransportSecurity;
  }
  if (raw.xContentTypeOptions) {
    securityResponseHeaders['X-Content-Type-Options'] = raw.xContentTypeOptions;
  }
  if (raw.referrerPolicy) {
    securityResponseHeaders['Referrer-Policy'] = raw.referrerPolicy;
  }

  // Browsers read `report-to` as a single token, so only the first endpoint was ever used.
  // Interpolating the whole list joined the names with commas, which split the parameter into
  // extra members of the policy.
  const [reportTo] = rawPermissionsPolicyConfig.report_to;
  const withReportTo = (policy: string) =>
    reportTo ? addReportToParameter(policy, reportTo) : policy;

  if (raw.permissionsPolicy) {
    securityResponseHeaders['Permissions-Policy'] = withReportTo(raw.permissionsPolicy);
  }

  if (raw.permissionsPolicyReportOnly && reportTo) {
    securityResponseHeaders['Permissions-Policy-Report-Only'] = withReportTo(
      raw.permissionsPolicyReportOnly
    );
  }

  if (raw.crossOriginOpenerPolicy) {
    securityResponseHeaders['Cross-Origin-Opener-Policy'] = raw.crossOriginOpenerPolicy;
  }
  if (disableEmbedding) {
    securityResponseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
  }

  return { securityResponseHeaders, disableEmbedding };
}
