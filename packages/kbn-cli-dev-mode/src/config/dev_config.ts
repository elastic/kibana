/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const devConfigSchema = schema.object(
  {
    basePathProxyTarget: schema.number({
      defaultValue: 5603,
    }),
  },
  { unknowns: 'ignore' }
);

export type DevConfigType = TypeOf<typeof devConfigSchema>;

export class DevConfig {
  public basePathProxyTargetPort: number;

  constructor(rawConfig: DevConfigType) {
    this.basePathProxyTargetPort = rawConfig.basePathProxyTarget;
  }
}
