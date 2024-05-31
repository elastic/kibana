/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

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
    defaultValue:
      'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()',
  }),
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
  raw: TypeOf<typeof securityResponseHeadersSchema>
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
  if (raw.permissionsPolicy) {
    securityResponseHeaders['Permissions-Policy'] = raw.permissionsPolicy;
  }
  if (raw.crossOriginOpenerPolicy) {
    securityResponseHeaders['Cross-Origin-Opener-Policy'] = raw.crossOriginOpenerPolicy;
  }
  if (disableEmbedding) {
    securityResponseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
  }

  return { securityResponseHeaders, disableEmbedding };
}
