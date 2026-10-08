/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveTypeCheckRootDir } from './execute_type_check_validation';

describe('resolveTypeCheckRootDir', () => {
  it('defaults to the project directory', () => {
    expect(resolveTypeCheckRootDir(['**/*.ts', '../../typings/**/*.d.ts'])).toBe('.');
  });

  it('includes parent directories containing source files', () => {
    expect(resolveTypeCheckRootDir(['**/*', '../cypress.config.ts'])).toBe('..');
    expect(resolveTypeCheckRootDir(['../../../outside.ts'])).toBe('../../..');
  });
});
