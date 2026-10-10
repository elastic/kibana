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
import { CriticalError } from '@kbn/core-base-server-internal';
import type {
  PermissionsPolicyConfigType,
  PermissionsPolicyDirectiveSetting,
} from './permissions_policy';
import {
  PermissionsPolicyDirectives,
  permissionsPolicyDirectiveSettings,
} from './permissions_policy';

const INVALID_CONFIG_EXIT_CODE = 78;

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
  // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
  // Deprecated in favor of the per-directive `permissionsPolicy.*` settings. There is no default
  // value, so that an explicit configuration can be told apart from an absent one: `undefined`
  // means Kibana builds the policy itself, `null` disables the header, and a string replaces the
  // policy wholesale.
  permissionsPolicy: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
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

type SecurityResponseHeadersConfigType = TypeOf<typeof securityResponseHeadersSchema>;

const hasDirectives = (
  directives: Readonly<Record<PermissionsPolicyDirectiveSetting, string[]>> | undefined
) => permissionsPolicyDirectiveSettings.some((setting) => directives?.[setting]?.length);

/**
 * Throws when a deprecated wholesale policy string is combined with the per-directive settings that
 * replace it. The two cannot be reconciled, so Kibana refuses to start rather than silently
 * discarding one of them.
 *
 * @internal
 */
export function validatePermissionsPolicyConfig(
  raw: SecurityResponseHeadersConfigType,
  rawPermissionsPolicyConfig: PermissionsPolicyConfigType
) {
  const conflicts: Array<[string, string]> = [];

  if (raw.permissionsPolicy !== undefined && hasDirectives(rawPermissionsPolicyConfig)) {
    conflicts.push([
      'server.securityResponseHeaders.permissionsPolicy',
      'permissionsPolicy.<directive>',
    ]);
  }

  if (
    raw.permissionsPolicyReportOnly !== undefined &&
    hasDirectives(rawPermissionsPolicyConfig.report_only)
  ) {
    conflicts.push([
      'server.securityResponseHeaders.permissionsPolicyReportOnly',
      'permissionsPolicy.report_only.<directive>',
    ]);
  }

  if (conflicts.length) {
    const message = conflicts
      .map(
        ([legacy, replacement]) =>
          `"${legacy}" cannot be used together with "${replacement}". Remove "${legacy}" and configure the individual directives instead.`
      )
      .join(' ');
    throw new CriticalError(message, 'InvalidConfig', INVALID_CONFIG_EXIT_CODE);
  }
}

/**
 * Parses raw security header config info, returning an object with the appropriate header keys and values.
 *
 * @param raw
 * @internal
 */
export function parseRawSecurityResponseHeadersConfig(
  raw: SecurityResponseHeadersConfigType,
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

  const reportTo = rawPermissionsPolicyConfig.report_to?.[0];
  const reportToParameter = reportTo ? `;report-to=${reportTo}` : '';
  const { enforceHeader, reportOnlyHeader } = PermissionsPolicyDirectives.fromConfig(
    rawPermissionsPolicyConfig
  ).getPermissionsPolicyHeadersByDisposition(reportTo);

  if (typeof raw.permissionsPolicy === 'string') {
    // A wholesale policy is opaque to Kibana, so the report-to parameter is appended as-is rather
    // than distributed across the directives it contains.
    securityResponseHeaders['Permissions-Policy'] = `${raw.permissionsPolicy}${reportToParameter}`;
  } else if (raw.permissionsPolicy === undefined) {
    securityResponseHeaders['Permissions-Policy'] = enforceHeader;
  }

  // The report-only header is pointless without somewhere to send the reports, so it is omitted.
  if (reportTo) {
    if (typeof raw.permissionsPolicyReportOnly === 'string') {
      securityResponseHeaders[
        'Permissions-Policy-Report-Only'
      ] = `${raw.permissionsPolicyReportOnly}${reportToParameter}`;
    } else if (reportOnlyHeader) {
      securityResponseHeaders['Permissions-Policy-Report-Only'] = reportOnlyHeader;
    }
  }

  if (raw.crossOriginOpenerPolicy) {
    securityResponseHeaders['Cross-Origin-Opener-Policy'] = raw.crossOriginOpenerPolicy;
  }
  if (disableEmbedding) {
    securityResponseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
  }

  return { securityResponseHeaders, disableEmbedding };
}
