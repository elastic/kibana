/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const config = {
  path: 'dev',
  schema: schema.object({
    basePathProxyTarget: schema.number({
      defaultValue: 5603,
    }),
  }),
};

export type DevConfigType = TypeOf<typeof config.schema>;

export class DevConfig {
  public basePathProxyTargetPort: number;

  /**
   * @internal
   */
  constructor(rawConfig: DevConfigType) {
    this.basePathProxyTargetPort = rawConfig.basePathProxyTarget;
  }
}
