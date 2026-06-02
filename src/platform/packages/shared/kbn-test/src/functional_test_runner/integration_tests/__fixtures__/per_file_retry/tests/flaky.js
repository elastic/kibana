/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Shared with per_file_retry.test.js — both compute the same path independently.
export const MARKER_PATH = join(tmpdir(), 'kbn_ftr_per_file_retry.marker');

export default function () {
  describe('flaky suite', () => {
    it('fails on first attempt, passes on second', () => {
      if (!existsSync(MARKER_PATH)) {
        // First run: leave a marker so the retry (second run) can pass.
        writeFileSync(MARKER_PATH, '');
        throw new Error('intentional first-attempt failure');
      }
      rmSync(MARKER_PATH);
    });
  });
}
