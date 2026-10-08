/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadEsConfigEsArgs, loadEsDevConfigEsArgs } from './es_config';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'es-dev-config-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const writeConfig = (contents: string, fileName = 'es.dev.yml') => {
  const configPath = path.join(tmpDir, fileName);
  fs.writeFileSync(configPath, contents);
  return configPath;
};

describe.each([
  ['loadEsDevConfigEsArgs', loadEsDevConfigEsArgs],
  ['loadEsConfigEsArgs', loadEsConfigEsArgs],
])('%s', (_name, loadEsArgs) => {
  it('returns an empty array when the file does not exist', () => {
    const configPath = path.join(tmpDir, 'does-not-exist.yml');
    expect(loadEsArgs(undefined, configPath)).toEqual([]);
  });

  it('returns an empty array when the file is empty', () => {
    const configPath = writeConfig('');
    expect(loadEsArgs(undefined, configPath)).toEqual([]);
  });

  it('flattens flat, dotted keys as-is', () => {
    const configPath = writeConfig('cluster.name: test\npath.data: /tmp/es-data\n');
    expect(loadEsArgs(undefined, configPath).sort()).toEqual([
      'cluster.name=test',
      'path.data=/tmp/es-data',
    ]);
  });

  it('flattens nested mappings into dotted keys', () => {
    const configPath = writeConfig(
      ['cluster:', '  name: test', 'xpack:', '  security:', '    enabled: true'].join('\n')
    );
    expect(loadEsArgs(undefined, configPath).sort()).toEqual([
      'cluster.name=test',
      'xpack.security.enabled=true',
    ]);
  });

  it('joins array values with commas', () => {
    const configPath = writeConfig('path.repo:\n  - /tmp/repo1\n  - /tmp/repo2\n');
    expect(loadEsArgs(undefined, configPath)).toEqual(['path.repo=/tmp/repo1,/tmp/repo2']);
  });

  it('throws a CLI error when the file does not parse to an object', () => {
    const configPath = writeConfig('- just\n- a\n- list\n');
    expect(() => loadEsArgs(undefined, configPath)).toThrow(/Expected .* to parse to an object/);
  });

  it('throws a CLI error when the YAML is malformed', () => {
    const configPath = writeConfig('cluster.name: [unterminated');
    expect(() => loadEsArgs(undefined, configPath)).toThrow(/Failed to parse/);
  });

  it('logs how many settings were loaded when a log is provided', () => {
    const configPath = writeConfig('cluster.name: test\n');
    const info = jest.fn();
    loadEsArgs({ info } as any, configPath);
    expect(info).toHaveBeenCalledWith(expect.stringContaining('Loaded 1 Elasticsearch setting'));
  });
});

describe('loadEsConfigEsArgs default path', () => {
  it('defaults to config/es.yml, which is fully commented out and has zero effect', () => {
    expect(loadEsConfigEsArgs()).toEqual([]);
  });
});
