/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { REPO_ROOT } from '@kbn/repo-info';

const execFileAsync = promisify(execFile);

/**
 * The other coverage tests call the collector directly, so they would still pass if the CLI
 * started writing the report for a mode that only reads it. `--report` is the input path for
 * `--surface` and the output path for `--coverage`, so this runs the command itself.
 */
describe('connector_vendor_api --coverage', () => {
  it('refuses --surface and leaves the report it would have overwritten alone', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'connector-coverage-cli-'));
    const report = path.join(directory, 'drift.json');
    const contents = '{"the": "drift report"}';
    await fs.writeFile(report, contents);

    try {
      const failure = await execFileAsync(
        process.execPath,
        ['scripts/connector_vendor_api', '--coverage', '--surface', '--report', report],
        { cwd: REPO_ROOT }
      ).then(
        () => undefined,
        (error) => error as { code?: number; stdout?: string; stderr?: string }
      );

      expect(failure).toBeDefined();
      expect(failure?.code).toBe(1);
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toContain(
        '--coverage reads the committed artifacts'
      );
      await expect(fs.readFile(report, 'utf8')).resolves.toBe(contents);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }, 120_000);
});
