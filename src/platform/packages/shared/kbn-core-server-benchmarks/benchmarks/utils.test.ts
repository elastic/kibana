/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { startKibana } from './utils';

describe('startKibana', () => {
  it('uses a non-FIPS config for a distributable built on a FIPS agent', async () => {
    const buildDir = await mkdtemp(path.join(os.tmpdir(), 'warm-start-memory-config-'));
    const packagedConfigDir = path.join(buildDir, 'config');
    const benchmarkConfigDir = path.join(buildDir, 'data', 'benchmark-config');

    try {
      await mkdir(path.join(buildDir, 'bin'));
      await mkdir(packagedConfigDir);
      await writeFile(path.join(packagedConfigDir, 'node.options'), '--enable-fips\n');
      await writeFile(
        path.join(packagedConfigDir, 'kibana.yml'),
        'xpack.security.fipsMode.enabled: true\n'
      );
      await writeFile(
        path.join(buildDir, 'bin', 'kibana'),
        '#!/bin/sh\n' +
          'test ! -f "$KBN_PATH_CONF/node.options" || exit 78\n' +
          'printf "Kibana is now available\\n"\n',
        { mode: 0o755 }
      );

      const { proc } = await startKibana({
        cwd: buildDir,
        buildDir,
        log: new ToolingLog(),
        port: 5701,
        esPort: 9200,
        isolatedConfig: true,
      });
      await proc;

      const benchmarkConfig = await readFile(path.join(benchmarkConfigDir, 'kibana.yml'), 'utf8');
      expect(benchmarkConfig).toContain('server.port: 5701');
      expect(benchmarkConfig).not.toContain('fipsMode');
      expect(await readFile(path.join(packagedConfigDir, 'node.options'), 'utf8')).toBe(
        '--enable-fips\n'
      );
      expect(await readFile(path.join(packagedConfigDir, 'kibana.yml'), 'utf8')).toBe(
        'xpack.security.fipsMode.enabled: true\n'
      );
    } finally {
      await rm(buildDir, { recursive: true, force: true });
    }
  });
});
