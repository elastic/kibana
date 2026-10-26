/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema, offeringBasedSchema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { DEFAULT_THEME_NAME } from '@kbn/core-ui-settings-common';
import type { ConfigDeprecationProvider } from '@kbn/config';

const deprecations: ConfigDeprecationProvider = ({ unused, renameFromRoot }) => [
  unused('enabled', { level: 'warning' }),
  renameFromRoot('server.defaultRoute', 'uiSettings.overrides.defaultRoute', { level: 'warning' }),
];

export const defaultThemeSchema = schema.oneOf([
  schema.literal('borealis'),
  // Allow experimental themes
  schema.string(),
]);

const configSchema = schema.object({
  overrides: schema.object({}, { unknowns: 'allow' }),
  globalOverrides: schema.object({}, { unknowns: 'allow' }),
  publicApiEnabled: offeringBasedSchema({ serverless: schema.boolean({ defaultValue: false }) }),
  experimental: schema.maybe(
    schema.object({
      themeSwitcherEnabled: schema.maybe(schema.boolean({ defaultValue: false })),
      defaultTheme: schema.maybe(schema.string({ defaultValue: DEFAULT_THEME_NAME })),
    })
  ),
});

export type UiSettingsConfigType = TypeOf<typeof configSchema>;

export const uiSettingsConfig: ServiceConfigDescriptor<UiSettingsConfigType> = {
  path: 'uiSettings',
  schema: configSchema,
  deprecations,
};
