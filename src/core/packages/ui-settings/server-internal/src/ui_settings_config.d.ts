/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
export declare const defaultThemeSchema: import('@kbn/config-schema').Type<string>;
declare const configSchema: import('@kbn/config-schema').ObjectType<{
  overrides: import('@kbn/config-schema').ObjectType<{}>;
  globalOverrides: import('@kbn/config-schema').ObjectType<{}>;
  publicApiEnabled: import('@kbn/config-schema').ConditionalType<true, boolean, boolean>;
  experimental: import('@kbn/config-schema').Type<
    | Readonly<
        {
          themeSwitcherEnabled?: boolean | undefined;
          defaultTheme?: string | undefined;
        } & {}
      >
    | undefined
  >;
}>;
export type UiSettingsConfigType = TypeOf<typeof configSchema>;
export declare const uiSettingsConfig: ServiceConfigDescriptor<UiSettingsConfigType>;
export {};
