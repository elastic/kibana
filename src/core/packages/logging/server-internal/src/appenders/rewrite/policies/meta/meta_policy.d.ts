/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecord } from '@kbn/logging';
import type { MetaRewritePolicyConfig } from '@kbn/core-logging-server';
import type { RewritePolicy } from '../policy';
export declare const metaRewritePolicyConfigSchema: import('@kbn/config-schema').ObjectType<{
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
/**
 * A rewrite policy which can add, remove, or update properties
 * from a record's {@link LogMeta}.
 */
export declare class MetaRewritePolicy implements RewritePolicy {
  private readonly config;
  constructor(config: MetaRewritePolicyConfig);
  rewrite(record: LogRecord): LogRecord;
  private update;
  private remove;
}
