/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse } from 'yaml';
import { createTelemetryIdentity } from './create_telemetry_identity';

describe('createTelemetryIdentity', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'nightshift-telemetry-test-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('grants only telemetry reads and metadata access, with a hashed file-realm password', () => {
    const { username, password, files } = createTelemetryIdentity(directory, []);
    expect(parse(readFileSync(join(directory, 'roles.yml'), 'utf8'))).toEqual({
      [username]: {
        cluster: [],
        indices: [
          {
            names: ['logs-*', 'metrics-*', 'traces-*'],
            privileges: ['read', 'view_index_metadata'],
            allow_restricted_indices: false,
          },
        ],
        run_as: [],
      },
    });
    expect(readFileSync(join(directory, 'users_roles'), 'utf8').trim()).toBe(
      `${username}:${username}`
    );
    expect(readFileSync(join(directory, 'users'), 'utf8').trim()).toMatch(
      /^nightshift_evals_telemetry:\{PBKDF2\}10000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/
    );
    for (const file of files) {
      expect(statSync(file).mode.toString(8).slice(-3)).toBe('600');
      expect(readFileSync(file, 'utf8')).not.toContain(password);
    }
  });

  it('retains inherited realm definitions and unrelated resources', () => {
    const parent = mkdtempSync(join(directory, 'parent-'));
    const inherited = {
      'roles.yml': 'existing_role:\n  cluster: [monitor]\n',
      users: 'existing_user:existing_hash\n',
      users_roles: 'existing_role:existing_user\n',
      'other.yml': 'unrelated: true\n',
    };
    const inheritedFiles = Object.entries(inherited).map(([name, content]) => {
      const path = join(parent, name);
      writeFileSync(path, content);
      return path;
    });
    const { files } = createTelemetryIdentity(directory, inheritedFiles);
    expect(files).toHaveLength(4);
    expect(files).toContain(join(parent, 'other.yml'));
    for (const name of ['roles.yml', 'users', 'users_roles'] as const) {
      expect(readFileSync(join(directory, name), 'utf8')).toContain(inherited[name]);
      expect(files).not.toContain(join(parent, name));
    }
    expect(parse(readFileSync(join(directory, 'roles.yml'), 'utf8')).existing_role).toEqual({
      cluster: ['monitor'],
    });
  });

  it('generates independent credentials for each Scout configuration', () => {
    const first = createTelemetryIdentity(directory, []);
    const firstUsers = readFileSync(join(directory, 'users'), 'utf8');
    const second = createTelemetryIdentity(directory, []);
    expect(second.password).not.toBe(first.password);
    expect(readFileSync(join(directory, 'users'), 'utf8')).not.toBe(firstUsers);
  });
});
