/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { LogRecord } from '@kbn/logging';
import { set } from '@kbn/safer-lodash-set';
import { has, unset } from 'lodash';
import { assertNever } from '@kbn/std';
import type { MetaRewritePolicyConfig } from '@kbn/core-logging-server';
import { RewritePolicy } from '../policy';

export const metaRewritePolicyConfigSchema = schema.object({
  type: schema.literal('meta'),
  mode: schema.oneOf([schema.literal('update'), schema.literal('remove')], {
    defaultValue: 'update',
  }),
  properties: schema.arrayOf(
    schema.object({
      path: schema.string(),
      value: schema.maybe(
        schema.nullable(schema.oneOf([schema.string(), schema.number(), schema.boolean()]))
      ),
    })
  ),
});

/**
 * A rewrite policy which can add, remove, or update properties
 * from a record's {@link LogMeta}.
 */
export class MetaRewritePolicy implements RewritePolicy {
  constructor(private readonly config: MetaRewritePolicyConfig) {}

  rewrite(record: LogRecord): LogRecord {
    switch (this.config.mode) {
      case 'update':
        return this.update(record);
      case 'remove':
        return this.remove(record);
      default:
        return assertNever(this.config.mode);
    }
  }

  private update(record: LogRecord) {
    for (const { path, value } of this.config.properties) {
      if (!has(record, `meta.${path}`)) {
        continue; // don't add properties which don't already exist
      }
      set(record, `meta.${path}`, value);
    }
    return record;
  }

  private remove(record: LogRecord) {
    for (const { path } of this.config.properties) {
      unset(record, `meta.${path}`);
    }
    return record;
  }
}
