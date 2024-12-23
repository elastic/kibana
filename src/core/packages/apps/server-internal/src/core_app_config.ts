/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

/**
 * Validation schema for Core App config.
 * @public
 */
export const configSchema = schema.object({
  allowDynamicConfigOverrides: schema.boolean({ defaultValue: false }),
});

export type CoreAppConfigType = TypeOf<typeof configSchema>;

export const CoreAppPath = 'coreApp';

export const config: ServiceConfigDescriptor<CoreAppConfigType> = {
  path: CoreAppPath,
  schema: configSchema,
};

/**
 * Wrapper of config schema.
 * @internal
 */
export class CoreAppConfig implements CoreAppConfigType {
  /**
   * @internal
   * When true, the HTTP API to dynamically extend the configuration is registered.
   *
   * @remarks
   * You should enable this at your own risk: Settings opted-in to being dynamically
   * configurable can be changed at any given point, potentially leading to unexpected behaviours.
   * This feature is mostly intended for testing purposes.
   */
  public readonly allowDynamicConfigOverrides: boolean;

  constructor(rawConfig: CoreAppConfig) {
    this.allowDynamicConfigOverrides = rawConfig.allowDynamicConfigOverrides;
  }
}
