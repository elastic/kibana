/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROTECTED_RULES } from './protected_rules';

describe('PROTECTED_RULES', () => {
  it('includes @kbn/imports/no_quarantined_imports so eslint-disable cannot bypass it', () => {
    expect(PROTECTED_RULES.has('@kbn/imports/no_quarantined_imports')).toBe(true);
  });
});
