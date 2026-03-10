/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { Plugin, CoreSetup } from '@kbn/core/server';

export class UserStorageTestPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.userStorage.register({
      'test:string_key': {
        schema: z.string(),
        defaultValue: 'default_value',
        scope: 'space',
      },
      'test:number_key': {
        schema: z.number(),
        defaultValue: 42,
        scope: 'global',
      },
      'test:object_key': {
        schema: z.object({
          theme: z.enum(['light', 'dark']),
          sidebar: z.object({
            collapsed: z.boolean(),
            width: z.number().min(100).max(500),
          }),
          pinnedItems: z.array(z.string()).max(10),
        }),
        defaultValue: {
          theme: 'light',
          sidebar: { collapsed: false, width: 250 },
          pinnedItems: [],
        },
        scope: 'space',
      },
      'test:boolean_key': {
        schema: z.boolean(),
        defaultValue: false,
        scope: 'global',
      },
      'test:array_key': {
        schema: z.array(z.string()),
        defaultValue: [],
        scope: 'space',
      },
    });
  }

  public start() {}

  public stop() {}
}
