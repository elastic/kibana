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
import { getDefaultProcesses } from '../default_processes';
import { createEsSettingsProvider } from './es_settings';
import { parseSettingInput, writeConfigSetting } from './kibana_dev_config';
import { createKibanaSettingsProvider } from './kibana_settings';

describe('writeConfigSetting', () => {
  let dir: string;
  let file: string;
  const read = () => fs.readFileSync(file, 'utf8');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-yml-'));
    file = path.join(dir, 'kibana.dev.yml');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('creates the file with a dotted key', () => {
    writeConfigSetting(file, 'xpack.fleet.enabled', false);
    expect(read()).toBe('xpack.fleet.enabled: false\n');
  });

  it('updates a nested or dotted entry in place and keeps comments', () => {
    fs.writeFileSync(
      file,
      '# my dev settings\nserver.port: 5601\nxpack.fleet:\n  enabled: true # off for now\n'
    );
    writeConfigSetting(file, 'xpack.fleet.enabled', false);
    writeConfigSetting(file, 'server.port', 5602);
    writeConfigSetting(file, 'logging.root.level', 'debug');
    expect(read()).toBe(
      '# my dev settings\nserver.port: 5602\nxpack.fleet:\n  enabled: false # off for now\nlogging.root.level: debug\n'
    );
  });

  it('removes an entry, its parents once empty, and keeps the comment above it', () => {
    fs.writeFileSync(file, '# my dev settings\nxpack.fleet:\n  enabled: true\nserver.port: 5601\n');
    writeConfigSetting(file, 'xpack.fleet.enabled', undefined);
    expect(read()).toBe('# my dev settings\nserver.port: 5601\n');
  });

  it('refuses a file that is not valid YAML', () => {
    fs.writeFileSync(file, 'server: [port\n');
    expect(() => writeConfigSetting(file, 'server.port', 1)).toThrow('is not valid YAML');
  });
});

describe('parseSettingInput', () => {
  it('reads values as YAML, and strings as typed', () => {
    expect(parseSettingInput('false', 'boolean')).toBe(false);
    expect(parseSettingInput('5602', 'number')).toBe(5602);
    expect(parseSettingInput('["a", "b"]', 'array')).toEqual(['a', 'b']);
    expect(parseSettingInput('30s', 'duration')).toBe('30s');
    expect(parseSettingInput('true', 'string')).toBe('true');
    expect(parseSettingInput('true')).toBe(true);
  });

  it('rejects values that do not match the type', () => {
    expect(() => parseSettingInput('yes please', 'boolean')).toThrow('Expected true or false');
    expect(() => parseSettingInput('many', 'number')).toThrow('Expected a number');
    expect(() => parseSettingInput('  ')).toThrow('Enter a value, or press u to unset');
  });
});

describe('Kibana settings editor', () => {
  let repoRoot: string;
  const devConfig = () => fs.readFileSync(path.join(repoRoot, 'config', 'kibana.dev.yml'), 'utf8');

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-editor-'));
    fs.mkdirSync(path.join(repoRoot, 'config'));
    fs.writeFileSync(path.join(repoRoot, 'config', 'kibana.yml'), 'server.host: localhost\n');
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  const editorFor = (kibanaArgs: readonly string[] = []) => {
    const { editor } = createKibanaSettingsProvider({ repoRoot, kibanaArgs, cacheDir: repoRoot });
    if (!editor) {
      throw new Error('expected an editor');
    }
    return editor;
  };

  it('sets and unsets settings in kibana.dev.yml, which Kibana applies by itself', async () => {
    const editor = editorFor();
    await expect(
      editor.set({ key: 'xpack.fleet.enabled', detail: 'boolean' }, 'false')
    ).resolves.toEqual({
      message:
        "Set xpack.fleet.enabled to false in config/kibana.dev.yml; Kibana's dev mode restarts its server to apply it.",
      needsRestart: false,
    });
    expect(devConfig()).toBe('xpack.fleet.enabled: false\n');

    await editor.unset({ key: 'xpack.fleet.enabled', source: 'config/kibana.dev.yml' });
    expect(devConfig()).toBe('');
  });

  it('warns when a flag sets the same setting, as the flag wins', async () => {
    const { message } = await editorFor(['--xpack.fleet.enabled=true']).set(
      { key: 'xpack.fleet.enabled' },
      'false'
    );
    expect(message).toContain('A --kibana-arg flag sets it too, and the flag wins.');
  });

  it('explains what it cannot unset or write', async () => {
    await expect(editorFor().unset({ key: 'server.host' })).rejects.toThrow(
      'server.host is set in config/kibana.yml; the TUI only changes config/kibana.dev.yml, where a value overrides it'
    );
    await expect(editorFor(['--server.port=1']).unset({ key: 'server.port' })).rejects.toThrow(
      'server.port is set by a --kibana-arg flag, which the TUI cannot change'
    );
    await expect(editorFor().unset({ key: 'server.port' })).rejects.toThrow(
      'server.port is not set'
    );
    await expect(editorFor(['--no-dev-config']).set({ key: 'server.port' }, '1')).rejects.toThrow(
      'Kibana runs with --no-dev-config, so it does not read config/kibana.dev.yml'
    );
  });
});

describe('Elasticsearch settings editor', () => {
  it('passes changes as -E flags the next time Elasticsearch starts', async () => {
    const [es] = getDefaultProcesses({ cacheDir: os.tmpdir() });
    const editor = es.settings?.editor;
    if (!editor || typeof es.args !== 'function') {
      throw new Error('expected an editor and computed arguments');
    }

    await expect(editor.set({ key: 'xpack.ml.enabled' }, ' false ')).resolves.toEqual({
      message:
        'Elasticsearch gets -E xpack.ml.enabled=false; press r on es to restart it with that (this run only)',
      needsRestart: true,
    });
    expect(es.args().slice(-2)).toEqual(['-E', 'xpack.ml.enabled=false']);

    await editor.unset({ key: 'xpack.ml.enabled', source: 'tui, -E' });
    expect(es.args()).not.toContain('-E');
  });

  it('only unsets what the TUI set', async () => {
    const { editor } = createEsSettingsProvider({
      esUrl: 'http://127.0.0.1:1',
      auth: { username: 'elastic', password: 'changeme' },
      overrides: new Map(),
    });
    await expect(editor?.unset({ key: 'cluster.name', source: 'node' })).rejects.toThrow(
      'cluster.name comes from node, not from the TUI, so it cannot be unset here'
    );
  });
});
