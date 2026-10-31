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

/**
 * RFC 8941 sf-key, the grammar of a member name in the `Reporting-Endpoints` header. A token
 * outside it, such as one with an uppercase letter, can never name a declared endpoint, so the
 * browser sends no reports.
 */
const REPORTING_ENDPOINT_NAME = /^[a-z*][a-z0-9_\-.*]*$/;

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
    // `report_to` is GA, and a bad value only disables reporting, so no value is rejected here. A
    // name that would corrupt the header is dropped by `getReportingEndpoint`, and the
    // deprecations below warn about it.
    report_to: schema.arrayOf(schema.string(), {
      defaultValue: [],
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

/**
 * Returns the reporting endpoint to send in the `report-to` parameter, or `undefined` when there is
 * none. Browsers use only the first endpoint, and a first endpoint that is not a token is dropped,
 * because it would corrupt the header.
 */
export const getReportingEndpoint = ({
  report_to: reportTo,
}: Pick<PermissionsPolicyConfigType, 'report_to'>): string | undefined => {
  const [name] = reportTo ?? [];
  return name !== undefined && REPORTING_GROUP_NAME.test(name) ? name : undefined;
};

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
    (settings, fromPath, addDeprecation) => {
      const reportTo = get(settings, `${fromPath}.report_to`);
      const [name] = Array.isArray(reportTo) ? reportTo : [];
      // Endpoint names in the "Reporting-Endpoints" header are lowercase structured-field keys, so
      // a name outside that grammar never receives reports. A name that is not even a token would
      // corrupt the header, so it is dropped as well. Warn rather than fail: this setting ships
      // today, and a bad value does not stop Kibana from working.
      if (typeof name === 'string' && !REPORTING_ENDPOINT_NAME.test(name)) {
        const isDropped = !REPORTING_GROUP_NAME.test(name);
        addDeprecation({
          level: 'warning',
          configPath: `${fromPath}.report_to`,
          title: isDropped
            ? `Setting "${fromPath}.report_to" is ignored`
            : `Setting "${fromPath}.report_to" names an endpoint that browsers cannot match`,
          message: isDropped
            ? `"${fromPath}.report_to" is set to "${name}", which is not a valid reporting endpoint name and would corrupt the permissions policy. Kibana ignores it, so it sends no "report-to" parameter and no "Permissions-Policy-Report-Only" header, and no permissions policy violation reports are sent.`
            : `"${fromPath}.report_to" is set to "${name}", but endpoint names in the "Reporting-Endpoints" header can contain only lowercase letters, digits, and _-.*, and must start with a lowercase letter or *. Browsers cannot match "${name}" to an endpoint, so they send no permissions policy violation reports.`,
          correctiveActions: {
            manualSteps: [
              `Rename the endpoint in both "${fromPath}.report_to" and "server.customResponseHeaders.Reporting-Endpoints" to a name that uses only lowercase letters, digits, and _-.*, for example "violations-endpoint".`,
            ],
          },
        });
      }
    },
  ],
};
