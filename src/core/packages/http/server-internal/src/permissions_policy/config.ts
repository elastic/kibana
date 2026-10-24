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
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { get } from 'lodash';

/**
 * Tokens that a Permissions-Policy allowlist may contain unquoted. Every other value is an origin
 * and gets double-quoted during serialization.
 *
 * See https://www.w3.org/TR/permissions-policy/
 */
const BARE_TOKENS = ['self', '*'];

/**
 * Characters that would terminate or corrupt the structured-field member this value is serialized
 * into. See RFC 8941.
 */
const ILLEGAL_CHARACTERS = /["(),;\s]/;

const MAX_DIRECTIVE_VALUE_LENGTH = 1000;
const MAX_DIRECTIVE_VALUES = 100;

const validateDirectiveValue = (value: string) => {
  if (value.length === 0) {
    return `an empty value is not allowed`;
  }
  if (ILLEGAL_CHARACTERS.test(value)) {
    return `"${value}" cannot contain quotes, parentheses, commas, semicolons, or whitespace`;
  }
  // URL parsing decodes a percent-encoded host, so the value would no longer mean what it says.
  if (value.includes('%')) {
    return `"${value}" cannot be percent-encoded. Write the origin as plain text, such as https://example.com`;
  }
  if (BARE_TOKENS.includes(value)) {
    return undefined;
  }
  if (value === 'none' || value === `'none'`) {
    return `"none" is a Content Security Policy keyword and is not valid in a permissions policy. An empty list adds no sources`;
  }
  if (value === 'src' || value === `'src'`) {
    return `"src" is valid only in an iframe allow attribute, not in a Permissions-Policy header`;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch (e) {
    return `"${value}" must be ${BARE_TOKENS.join(', ')}, or an origin such as https://example.com`;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `"${value}" must use the http or https protocol`;
  }
  if (url.username || url.password) {
    return `"${value}" must be an origin without a username or password`;
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    return `"${value}" must be an origin without a path, query, or fragment`;
  }
  // The parsed origin is what gets serialized, and parsing can turn harmless-looking input into
  // characters that end the quoted string: IDNA maps a fullwidth quote (U+FF02) to `"`, for example.
  if (ILLEGAL_CHARACTERS.test(url.origin)) {
    return `"${value}" becomes "${url.origin}" once parsed, which contains quotes, parentheses, commas, semicolons, or whitespace`;
  }
  return undefined;
};

const directiveValidator = (values: string[]) => {
  for (const value of values) {
    const error = validateDirectiveValue(value);
    if (error) {
      return error;
    }
  }
};

const directiveArraySchema = (defaultValue?: string[]) =>
  schema.arrayOf(schema.string({ maxLength: MAX_DIRECTIVE_VALUE_LENGTH }), {
    defaultValue,
    maxSize: MAX_DIRECTIVE_VALUES,
    validate: directiveValidator,
  });

/** An enforced directive. Absent and empty mean the same: nothing is added to the built-in policy. */
const directiveSchema = () => directiveArraySchema([]);

/**
 * A report-only directive. It has no default, so an explicitly empty list stays distinct from an
 * absent one and serializes as `name=()`, which reports every use of the feature.
 */
const reportOnlyDirectiveSchema = () => schema.maybe(directiveArraySchema());

/**
 * RFC 8941 sf-token, the grammar the `report-to` structured-field parameter is serialized as. A
 * value outside it terminates the parameter and injects further members into the policy, which
 * weakens it rather than only breaking reporting.
 */
const REPORTING_GROUP_NAME = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/;

const validateReportingGroupName = (value: string) => {
  if (!REPORTING_GROUP_NAME.test(value)) {
    return (
      `"${value}" must be a reporting group name, which starts with a letter or * and ` +
      "contains only letters, digits and !#$%&'*+-.^_`|~:/"
    );
  }
};

const reportingGroupNameValidator = (values: string[]) => {
  for (const value of values) {
    const error = validateReportingGroupName(value);
    if (error) {
      return error;
    }
  }
};

const directivesSchema = <T>(directive: () => T) => ({
  camera: directive(),
  display_capture: directive(),
  fullscreen: directive(),
  geolocation: directive(),
  microphone: directive(),
  web_share: directive(),
});

/** The configuration keys that map to a Permissions-Policy directive. */
export const permissionsPolicyDirectiveSettings = [
  'camera',
  'display_capture',
  'fullscreen',
  'geolocation',
  'microphone',
  'web_share',
] as const;

/** A key of {@link permissionsPolicyDirectiveSettings}. */
export type PermissionsPolicyDirectiveSetting = (typeof permissionsPolicyDirectiveSettings)[number];

const configSchema = schema.object(
  {
    // Switches off the enforced Permissions-Policy header. The Permissions-Policy-Report-Only
    // header is controlled by `report_only` and `report_to` alone, and is not affected.
    enabled: schema.boolean({ defaultValue: true }),
    ...directivesSchema(directiveSchema),
    report_only: schema.maybe(schema.object(directivesSchema(reportOnlyDirectiveSchema))),
    // `report_to` is GA, so only the token grammar is enforced: it rejects exactly the values that
    // corrupt the header. Extra endpoints are ignored by browsers, and the deprecation below warns.
    report_to: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: reportingGroupNameValidator,
    }),
  },
  {
    validate: (config) => {
      if (
        !config.enabled &&
        permissionsPolicyDirectiveSettings.some((setting) => config[setting].length)
      ) {
        return 'cannot use `permissionsPolicy.<directive>` when `permissionsPolicy.enabled` is false, because the Permissions-Policy header is not sent';
      }

      const hasReportOnlyDirectives = permissionsPolicyDirectiveSettings.some(
        (setting) => config.report_only?.[setting] !== undefined
      );
      if (hasReportOnlyDirectives && !config.report_to.length) {
        return 'cannot use `permissionsPolicy.report_only` without `permissionsPolicy.report_to`, because the Permissions-Policy-Report-Only header is only sent when a reporting endpoint is configured';
      }
    },
  }
);

/**
 * @internal
 */
export type PermissionsPolicyConfigType = TypeOf<typeof configSchema>;

export const permissionsPolicyConfig: ServiceConfigDescriptor<PermissionsPolicyConfigType> = {
  path: 'permissionsPolicy',
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const reportTo = get(settings, `${fromPath}.report_to`);
      // A browser reads "report-to" as a structured-field parameter, which holds a single token,
      // so it has only ever used the first endpoint. Warn rather than fail: this setting ships
      // today, and rejecting it would stop an existing deployment from starting.
      if (Array.isArray(reportTo) && reportTo.length > 1) {
        addDeprecation({
          level: 'warning',
          configPath: `${fromPath}.report_to`,
          title: `Setting "${fromPath}.report_to" accepts only one reporting endpoint`,
          message: `"${fromPath}.report_to" lists ${reportTo.length} endpoints, but browsers use only the first one, "${reportTo[0]}". The other endpoints are ignored.`,
          correctiveActions: {
            manualSteps: [
              `Set "${fromPath}.report_to" to a single endpoint, for example "${fromPath}.report_to: ['${reportTo[0]}']".`,
            ],
          },
        });
      }
    },
  ],
};
