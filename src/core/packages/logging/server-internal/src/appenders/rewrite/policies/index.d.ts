/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RewritePolicyConfig } from '@kbn/core-logging-server';
import type { RewritePolicy } from './policy';
export type { RewritePolicy };
export declare const rewritePolicyConfigSchema: import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'meta'>;
  mode: import('@kbn/config-schema').Type<'remove' | 'update'>;
  properties: import('@kbn/config-schema').Type<
    Readonly<
      {
        value?: string | number | boolean | null | undefined;
      } & {
        path: string;
      }
    >[]
  >;
}>;
export declare const createRewritePolicy: (config: RewritePolicyConfig) => RewritePolicy;
