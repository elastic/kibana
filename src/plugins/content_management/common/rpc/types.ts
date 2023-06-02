/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Type } from '@kbn/config-schema';

export interface ProcedureSchemas {
  in: Type<any> | false;
  out?: Type<any> | false;
}

export type ItemResult<T = unknown, M = void> = M extends void
  ? {
      item: T;
    }
  : {
      item: T;
      meta: M;
    };
