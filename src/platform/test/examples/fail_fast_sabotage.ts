/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TEMPORARY: sabotage suite to exercise the FTR consecutive-failure fail-fast.
// Produces a streak of failures so the run aborts early (exit 91 -> step 11).
// Revert before merging.

// eslint-disable-next-line import/no-default-export
export default function () {
  describe('fail-fast sabotage (temporary, revert before merge)', function () {
    it('sabotage failure 1', async () => {
      throw new Error('fail-fast sabotage 1');
    });
    it('sabotage failure 2', async () => {
      throw new Error('fail-fast sabotage 2');
    });
    it('sabotage failure 3', async () => {
      throw new Error('fail-fast sabotage 3');
    });
    it('sabotage failure 4', async () => {
      throw new Error('fail-fast sabotage 4');
    });
  });
}
