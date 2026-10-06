/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const pidConfig: {
  path: string;
  schema: import('@kbn/config-schema').ObjectType<{
    file: import('@kbn/config-schema').Type<string | undefined>;
    exclusive: import('@kbn/config-schema').Type<boolean>;
  }>;
};
export type PidConfigType = TypeOf<typeof pidConfig.schema>;
