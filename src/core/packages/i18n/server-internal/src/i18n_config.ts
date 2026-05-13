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
import type { ConfigDeprecationProvider } from '@kbn/config';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { SUPPORTED_LOCALE_IDS } from '@kbn/i18n';

const DEFAULT_LOCALES = [...SUPPORTED_LOCALE_IDS];

const configSchema = schema.object(
  {
    locales: schema.arrayOf(schema.string(), { defaultValue: DEFAULT_LOCALES, maxSize: 10 }),
    defaultLocale: schema.string({ defaultValue: 'en' }),
  },
  {
    validate: ({ locales, defaultLocale }) => {
      if (locales.length > 0 && !locales.includes(defaultLocale)) {
        return `[i18n.defaultLocale]: "${defaultLocale}" must be one of [i18n.locales] (${locales.join(
          ', '
        )})`;
      }
    },
  }
);

const deprecations: ConfigDeprecationProvider = ({ renameFromRoot }) => [
  renameFromRoot('i18n.locale', 'i18n.defaultLocale', { level: 'warning' }),
];

export type I18nConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<I18nConfigType> = {
  path: 'i18n',
  schema: configSchema,
  deprecations,
};
