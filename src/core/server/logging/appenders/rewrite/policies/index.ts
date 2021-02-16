/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { assertNever } from '@kbn/std';
import { RewritePolicy } from './policy';
import { MetaRewritePolicy, MetaRewritePolicyConfig, metaRewritePolicyConfigSchema } from './meta';

export { RewritePolicy };

/**
 * Available rewrite policies which specify what part of a {@link LogRecord}
 * can be modified.
 */
export type RewritePolicyConfig = MetaRewritePolicyConfig;

const REDACTED_HEADER_TEXT = '[REDACTED]';

const defaultPolicy: MetaRewritePolicyConfig = {
  type: 'meta',
  mode: 'update',
  properties: [
    { path: 'http.request.headers.authorization', value: REDACTED_HEADER_TEXT },
    { path: 'http.request.headers.cookie', value: REDACTED_HEADER_TEXT },
    { path: 'http.response.headers.set-cookie', value: REDACTED_HEADER_TEXT },
  ],
};

export const rewritePolicyConfigSchema = schema.oneOf([metaRewritePolicyConfigSchema], {
  defaultValue: defaultPolicy,
});

export const createRewritePolicy = (config: RewritePolicyConfig): RewritePolicy => {
  switch (config.type) {
    case 'meta':
      return new MetaRewritePolicy(config);
    default:
      return assertNever(config.type);
  }
};
