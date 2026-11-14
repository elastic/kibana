/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { createEsSettingsProvider } from './es_settings';
import { flattenConfig, formatValue } from './format';
import {
  createKibanaSettingsProvider,
  getKibanaCurrentSettings,
  parseKibanaArgs,
} from './kibana_settings';

describe('flattenConfig and formatValue', () => {
  it('flattens nested config into dotted keys and keeps arrays whole', () => {
    expect(
      flattenConfig({
        server: { port: 5601, ssl: { enabled: false } },
        hosts: ['a', 'b'],
        empty: {},
      })
    ).toEqual([
      ['server.port', 5601],
      ['server.ssl.enabled', false],
      ['hosts', ['a', 'b']],
      ['empty', {}],
    ]);
  });

  it('masks values of settings that look like credentials', () => {
    expect(formatValue('elasticsearch.password', 'changeme')).toBe('••••');
    expect(formatValue('xpack.encryptedSavedObjects.encryptionKey', 'a'.repeat(32))).toBe('••••');
    expect(formatValue('elasticsearch.serviceAccountToken', 'abc')).toBe('••••');
    expect(formatValue('xpack.security.authc.token.enabled', true)).toBe('true');
    expect(formatValue('server.port', 5601)).toBe('5601');
    expect(formatValue('elasticsearch.hosts', ['http://localhost:9200'])).toBe(
      '["http://localhost:9200"]'
    );
  });
});

describe('parseKibanaArgs', () => {
  it('reads settings, config files and --no-dev-config', () => {
    expect(
      parseKibanaArgs([
        '--xpack.fleet.enabled=false',
        '--logging.root.level',
        'debug',
        '--port',
        '5611',
        '-c',
        'config/custom.yml',
        '--no-dev-config',
        '--verbose',
      ])
    ).toEqual({
      configFiles: ['config/custom.yml'],
      settings: [
        ['xpack.fleet.enabled', 'false'],
        ['logging.root.level', 'debug'],
        ['server.port', '5611'],
      ],
      loadsDevConfig: false,
    });
  });
});

describe('Kibana settings', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-settings-'));
    fs.mkdirSync(path.join(repoRoot, 'config'));
    fs.writeFileSync(
      path.join(repoRoot, 'config', 'kibana.yml'),
      'server.port: 5601\nelasticsearch:\n  hosts: ["http://localhost:9200"]\n'
    );
    fs.writeFileSync(
      path.join(repoRoot, 'config', 'kibana.dev.yml'),
      'server.port: 5602\nelasticsearch.password: secret\n'
    );
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('merges kibana.yml, kibana.dev.yml and flags, later ones winning', () => {
    const { rows, notes } = getKibanaCurrentSettings({
      repoRoot,
      kibanaArgs: ['--server.port=5603', '--xpack.fleet.enabled=false'],
      cacheDir: repoRoot,
    });
    expect(rows).toEqual([
      {
        key: 'elasticsearch.hosts',
        value: '["http://localhost:9200"]',
        source: 'config/kibana.yml',
      },
      { key: 'elasticsearch.password', value: '••••', source: 'config/kibana.dev.yml' },
      { key: 'server.port', value: '5603', source: 'flag' },
      { key: 'xpack.fleet.enabled', value: 'false', source: 'flag' },
    ]);
    expect(notes[0]).toBe('From config/kibana.yml, config/kibana.dev.yml, flags.');
  });

  it('skips kibana.dev.yml with --no-dev-config', () => {
    const { rows } = getKibanaCurrentSettings({
      repoRoot,
      kibanaArgs: ['--no-dev-config'],
      cacheDir: repoRoot,
    });
    expect(rows.find(({ key }) => key === 'server.port')).toMatchObject({
      value: '5601',
      source: 'config/kibana.yml',
    });
  });

  it('lists every setting from the cache, with the current value of the ones that are set', async () => {
    // Outside a git checkout the commit is unknown, which names the cache file.
    fs.writeFileSync(
      path.join(repoRoot, 'kibana_settings.unknown.json'),
      JSON.stringify([
        { setting: 'server.port', type: 'number?' },
        { setting: 'server.host', type: 'string?' },
      ])
    );
    const provider = createKibanaSettingsProvider({ repoRoot, kibanaArgs: [], cacheDir: repoRoot });
    const { rows } = await provider.available();
    expect(rows).toEqual([
      { key: 'server.host', detail: 'string' },
      { key: 'server.port', value: '5602', source: 'config/kibana.dev.yml', detail: 'number' },
    ]);
  });
});

describe('Elasticsearch settings', () => {
  let server: http.Server;
  let esUrl: string;
  const requests: string[] = [];

  beforeAll(async () => {
    server = http.createServer((request, response) => {
      requests.push(`${request.url} ${request.headers.authorization}`);
      const url = new URL(request.url ?? '/', 'http://localhost');
      response.setHeader('content-type', 'application/json');
      if (url.pathname === '/_nodes/_local/settings') {
        response.end(
          JSON.stringify({
            nodes: { abc: { settings: { 'cluster.name': 'dev', 'bootstrap.password': 'secret' } } },
          })
        );
        return;
      }
      response.end(
        JSON.stringify({
          persistent: { 'cluster.routing.allocation.enable': 'primaries' },
          transient: {},
          ...(url.searchParams.get('include_defaults') === 'true'
            ? { defaults: { 'cluster.name': 'elasticsearch', 'action.auto_create_index': 'true' } }
            : {}),
        })
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    esUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
  });

  it('reports node and cluster settings as current, masking secrets', async () => {
    const provider = createEsSettingsProvider({
      esUrl,
      auth: { username: 'elastic', password: 'changeme' },
      overrides: new Map(),
    });
    const { rows } = await provider.current();
    expect(rows).toEqual([
      { key: 'bootstrap.password', value: '••••', source: 'node' },
      { key: 'cluster.name', value: 'dev', source: 'node' },
      {
        key: 'cluster.routing.allocation.enable',
        value: 'primaries',
        source: 'cluster, persistent',
      },
    ]);
    expect(requests[0]).toContain(`Basic ${Buffer.from('elastic:changeme').toString('base64')}`);
  });

  it('lists every setting with its default, and the value of the ones that are set', async () => {
    const provider = createEsSettingsProvider({
      esUrl,
      auth: { username: 'elastic', password: 'changeme' },
      overrides: new Map(),
    });
    const { rows } = await provider.available();
    expect(rows).toEqual([
      { key: 'action.auto_create_index', detail: 'default true' },
      { key: 'bootstrap.password', value: '••••', source: 'node', detail: undefined },
      { key: 'cluster.name', value: 'dev', source: 'node', detail: 'default elasticsearch' },
      {
        key: 'cluster.routing.allocation.enable',
        value: 'primaries',
        source: 'cluster, persistent',
        detail: undefined,
      },
    ]);
  });

  it('explains when Elasticsearch is not answering yet', async () => {
    const provider = createEsSettingsProvider({
      esUrl: 'http://127.0.0.1:1',
      auth: { username: 'elastic', password: 'changeme' },
      overrides: new Map(),
    });
    await expect(provider.current()).rejects.toThrow(
      'Elasticsearch is not answering at http://127.0.0.1:1; its settings show once it is ready'
    );
  });
});
