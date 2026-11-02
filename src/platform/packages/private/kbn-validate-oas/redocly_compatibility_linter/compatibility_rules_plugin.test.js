/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const compatibilityRulesPlugin = require('./compatibility_rules_plugin');

describe('compatibility rules plugin predicates', () => {
  it('identifies path parameter objects', () => {
    expect(
      compatibilityRulesPlugin._test.isPathParameter({
        in: 'path',
        name: 'id',
        required: true,
      })
    ).toBe(true);
    expect(
      compatibilityRulesPlugin._test.isPathParameter({
        in: 'query',
        name: 'id',
      })
    ).toBe(false);
  });

  it('identifies the nullable placeholder that must not reach the final spec', () => {
    expect(
      compatibilityRulesPlugin._test.isNullablePlaceholder({
        enum: [],
        nullable: true,
      })
    ).toBe(true);
    expect(
      compatibilityRulesPlugin._test.isNullablePlaceholder({
        enum: [null],
        nullable: true,
        type: 'string',
      })
    ).toBe(false);
  });
});
