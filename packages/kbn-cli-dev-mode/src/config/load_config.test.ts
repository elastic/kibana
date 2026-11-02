/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import { TestLog } from '../log';
import { convertToLogger } from '../log_adapter';
import { loadConfig } from './load_config';

describe('loadConfig basePathProxyTargetPort', () => {
  const load = async (yml: string) => {
    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-dev-config-'));
    const file = Path.join(dir, 'kibana.yml');
    Fs.writeFileSync(file, yml);
    const env = Env.createDefault(REPO_ROOT, {
      configs: [file],
      cliArgs: {},
      repoPackages: getPackages(REPO_ROOT),
    });
    const { dev } = await loadConfig({
      env,
      logger: convertToLogger(new TestLog()),
      rawConfigAdapter: (raw) => raw,
    });
    Fs.rmSync(dir, { recursive: true });
    return dev.basePathProxyTargetPort;
  };

  it('defaults to server.port + 1', async () => {
    expect(await load('server.port: 5604\n')).toBe(5605);
  });

  it('prefers an explicit dev.basePathProxyTarget', async () => {
    expect(await load('server.port: 5604\ndev.basePathProxyTarget: 7000\n')).toBe(7000);
  });
});
