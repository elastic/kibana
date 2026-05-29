/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { expectConfigSchema } from './expect_config_schema';

describe('expectConfigSchema', () => {
  it('does not throw for a config schema', () => {
    expect(() => expectConfigSchema(schema.string())).not.toThrow();
  });

  it('throws for a non-config-schema value', () => {
    expect(() => expectConfigSchema('not a schema')).toThrow();
  });
});
