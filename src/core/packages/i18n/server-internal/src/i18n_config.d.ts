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
declare const configSchema: import('@kbn/config-schema').ObjectType<{
  locales: import('@kbn/config-schema').Type<string[]>;
  defaultLocale: import('@kbn/config-schema').Type<string>;
  allowLocaleCookie: import('@kbn/config-schema').Type<boolean>;
}>;
export type I18nConfigType = TypeOf<typeof configSchema>;
export declare const config: ServiceConfigDescriptor<I18nConfigType>;
export {};
