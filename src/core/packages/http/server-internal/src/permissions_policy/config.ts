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
const BARE_TOKENS = ['self', 'src', '*'];

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
  if (BARE_TOKENS.includes(value)) {
    return undefined;
  }
  if (value === 'none' || value === `'none'`) {
    return `"none" is a Content Security Policy keyword and is not valid in a permissions policy. To deny a feature, leave its list empty, which is already the default`;
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
  if (url.pathname !== '/' || url.search || url.hash) {
    return `"${value}" must be an origin without a path, query, or fragment`;
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

const directiveSchema = () =>
  schema.arrayOf(schema.string({ maxLength: MAX_DIRECTIVE_VALUE_LENGTH }), {
    defaultValue: [],
    maxSize: MAX_DIRECTIVE_VALUES,
    validate: directiveValidator,
  });

const directivesSchema = () => ({
  camera: directiveSchema(),
  display_capture: directiveSchema(),
  fullscreen: directiveSchema(),
  geolocation: directiveSchema(),
  microphone: directiveSchema(),
  web_share: directiveSchema(),
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
    ...directivesSchema(),
    report_only: schema.maybe(schema.object(directivesSchema())),
    report_to: schema.arrayOf(schema.string(), {
      defaultValue: [],
    }),
  },
  {
    validate: (config) => {
      const hasReportOnlyDirectives = permissionsPolicyDirectiveSettings.some(
        (setting) => (config.report_only?.[setting]?.length ?? 0) > 0
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
