/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { discoverSessionApiEmbeddableOverridesSchema } from './embeddable_overrides';

describe('discoverSessionApiEmbeddableOverridesSchema', () => {
  it('defaults to an empty object when omitted', () => {
    expect(discoverSessionApiEmbeddableOverridesSchema.parse(undefined)).toEqual({});
  });

  it('validates partial overrides', () => {
    expect(
      discoverSessionApiEmbeddableOverridesSchema.parse({
        column_order: ['@timestamp', 'message'],
        row_height: 'auto',
      })
    ).toEqual({
      column_order: ['@timestamp', 'message'],
      row_height: 'auto',
    });
  });
});
