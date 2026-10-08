/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chmod, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import { extractAndArchiveLogs } from './extract_and_archive_logs';

describe('extractAndArchiveLogs', () => {
  it('archives both Docker output streams', async () => {
    const outputFolder = await mkdtemp(join(tmpdir(), 'kbn-es-logs-'));
    const originalPath = process.env.PATH;

    try {
      const dockerPath = join(outputFolder, 'docker');
      await writeFile(
        dockerPath,
        '#!/bin/sh\nif [ "$1" = "ps" ]; then\n  printf "abc123\\n"\nelse\n  printf "stdout log\\n"\n  printf "stderr log\\n" >&2\nfi\n'
      );
      await chmod(dockerPath, 0o755);
      process.env.PATH = outputFolder + ':' + originalPath;

      const files = await extractAndArchiveLogs({
        outputFolder,
        nodeNames: ['uiam'],
        log: new ToolingLog(),
      });

      expect(files).toEqual(['uiam-abc123.log']);
      expect(await readFile(join(outputFolder, 'uiam-abc123.log'), 'utf8')).toBe(
        'stdout log\nstderr log\n'
      );
    } finally {
      process.env.PATH = originalPath;
      await rm(outputFolder, { recursive: true, force: true });
    }
  });
});
