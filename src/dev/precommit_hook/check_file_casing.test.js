/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkFileCasing } from './check_file_casing';

const noopLog = {};
const getSnakeCase = () => 'snake_case';

describe('dev/precommit_hook/check_file_casing', () => {
  it('reports a readable message for single violations', async () => {
    await expect(checkFileCasing(noopLog, ['AGENTS.md'], getSnakeCase)).rejects.toThrow(
      "Casing violation: AGENTS.md (segment 'AGENTS.md' must use snake_case, e.g. 'agents.md')"
    );
  });

  it('skips files that match ignore patterns', async () => {
    await expect(
      checkFileCasing(noopLog, ['AGENTS.md'], getSnakeCase, {
        ignorePatterns: ['**/+([A-Z_]).md'],
      })
    ).resolves.toBeUndefined();
  });
});
