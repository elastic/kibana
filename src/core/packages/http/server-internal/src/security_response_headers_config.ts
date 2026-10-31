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
  addReportToParameter,
  getReportingEndpoint,
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

// An explicitly empty report-only list is a configured directive, so it counts as set.
const hasReportOnlyDirectives = (
  directives: Readonly<Partial<Record<PermissionsPolicyDirectiveSetting, string[]>>> | undefined
) => permissionsPolicyDirectiveSettings.some((setting) => directives?.[setting] !== undefined);

/**
 * Throws when a deprecated wholesale policy setting is combined with a `permissionsPolicy.*` setting
 * that contradicts it. The two cannot be reconciled, so Kibana refuses to start rather than
 * silently discarding one of them.
 *
 * @internal
 */
export function validatePermissionsPolicyConfig(
  raw: SecurityResponseHeadersConfigType,
  rawPermissionsPolicyConfig: PermissionsPolicyConfigType
) {
  const conflicts: string[] = [];
  const legacy = 'server.securityResponseHeaders.permissionsPolicy';
  const legacyReportOnly = 'server.securityResponseHeaders.permissionsPolicyReportOnly';

  // `null` disables the header outright, so telling the administrator to configure the individual
  // directives instead would turn it back on.
  const describeConflict = (setting: string, value: string | null, replacement: string) =>
    value === null
      ? `"${setting}" is set to null, which disables the header, so it cannot be used together with "${replacement}", which adds to it. Remove one of them.`
      : `"${setting}" cannot be used together with "${replacement}". Remove "${setting}" and configure the individual directives instead.`;

  if (raw.permissionsPolicy !== undefined && hasDirectives(rawPermissionsPolicyConfig)) {
    conflicts.push(
      describeConflict(legacy, raw.permissionsPolicy, 'permissionsPolicy.<directive>')
    );
  }

  // `null` and `enabled: false` both mean no header, so only a policy string contradicts it.
  if (rawPermissionsPolicyConfig.enabled === false && typeof raw.permissionsPolicy === 'string') {
    conflicts.push(
      `"${legacy}" sets a policy, but "permissionsPolicy.enabled" is false, which disables the header. Remove "${legacy}".`
    );
  }

  if (
    raw.permissionsPolicyReportOnly !== undefined &&
    hasReportOnlyDirectives(rawPermissionsPolicyConfig.report_only)
  ) {
    conflicts.push(
      describeConflict(
        legacyReportOnly,
        raw.permissionsPolicyReportOnly,
        'permissionsPolicy.report_only.<directive>'
      )
    );
  }

  if (conflicts.length) {
    const message = conflicts.join(' ');
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

  // An invalid endpoint name is dropped here, so it never reaches either header.
  const reportTo = getReportingEndpoint(rawPermissionsPolicyConfig);
  const withReportTo = (policy: string) =>
    reportTo ? addReportToParameter(policy, reportTo) : policy;
  const { enforceHeader, reportOnlyHeader } = PermissionsPolicyDirectives.fromConfig(
    rawPermissionsPolicyConfig
  ).getPermissionsPolicyHeadersByDisposition(reportTo);

  // `permissionsPolicy.enabled: false` switches off the enforced header only. The report-only
  // header below has its own settings and is still sent when they are configured.
  if (rawPermissionsPolicyConfig.enabled !== false) {
    if (typeof raw.permissionsPolicy === 'string') {
      // An empty policy carries no directive to attach `report-to` to, and would serialize as a
      // malformed `;report-to=...`, so it sends no header.
      if (raw.permissionsPolicy.trim()) {
        securityResponseHeaders['Permissions-Policy'] = withReportTo(raw.permissionsPolicy);
      }
    } else if (raw.permissionsPolicy === undefined) {
      securityResponseHeaders['Permissions-Policy'] = enforceHeader;
    }
  }

  // The report-only header is pointless without somewhere to send the reports, so it is omitted.
  if (reportTo) {
    if (typeof raw.permissionsPolicyReportOnly === 'string') {
      if (raw.permissionsPolicyReportOnly.trim()) {
        securityResponseHeaders['Permissions-Policy-Report-Only'] = withReportTo(
          raw.permissionsPolicyReportOnly
        );
      }
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
