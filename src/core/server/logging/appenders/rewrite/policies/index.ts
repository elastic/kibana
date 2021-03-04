/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assertNever } from '@kbn/std';
import { RewritePolicy } from './policy';
import { MetaRewritePolicy, MetaRewritePolicyConfig, metaRewritePolicyConfigSchema } from './meta';

export type { RewritePolicy };

/**
 * Available rewrite policies which specify what part of a {@link LogRecord}
 * can be modified.
 */
export type RewritePolicyConfig = MetaRewritePolicyConfig;

export const rewritePolicyConfigSchema = metaRewritePolicyConfigSchema;

export const createRewritePolicy = (config: RewritePolicyConfig): RewritePolicy => {
  switch (config.type) {
    case 'meta':
      return new MetaRewritePolicy(config);
    default:
      return assertNever(config.type);
  }
};
