/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ConfigDeprecationProvider } from 'src/core/server';
import { ServiceConfigDescriptor } from '../internal_types';

const deprecations: ConfigDeprecationProvider = ({ unused, renameFromRoot }) => [
  unused('enabled', { level: 'warning' }),
  renameFromRoot('server.defaultRoute', 'uiSettings.overrides.defaultRoute', { level: 'warning' }),
];

const configSchema = schema.object({
  overrides: schema.object({}, { unknowns: 'allow' }),
});

export type UiSettingsConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<UiSettingsConfigType> = {
  path: 'uiSettings',
  schema: configSchema,
  deprecations,
};
