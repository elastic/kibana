/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { parse as parseYaml } from 'yaml';

import { SERVERLESS_ROLES_ROOT_PATH } from '../paths';
import {
  readRolesDescriptorsFromResource,
  readRolesFromResource,
} from './read_roles_from_resource';

// Local-only roles that have no counterpart among the customer-facing predefined roles.
const TEST_ONLY_ROLES = ['system_indices_superuser'];

describe('readRolesDescriptorsFromResource', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'kbn-es-roles-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('drops reserved metadata keys and keeps the rest of the descriptor', () => {
    const rolesFile = join(tempDir, 'roles.yml');
    writeFileSync(
      rolesFile,
      `
viewer:
  metadata:
    _public: true
    _reserved: true
    team: platform
  cluster: ['manage_own_api_key']
editor:
  metadata:
    _public: true
  cluster: ['all']
custom:
  cluster: ['monitor']
`
    );

    expect(readRolesDescriptorsFromResource(rolesFile)).toEqual({
      viewer: { metadata: { team: 'platform' }, cluster: ['manage_own_api_key'] },
      editor: { cluster: ['all'] },
      custom: { cluster: ['monitor'] },
    });
  });

  it('throws for a non-yml file', () => {
    expect(() => readRolesDescriptorsFromResource(join(tempDir, 'roles.json'))).toThrow(
      'does not exist or not a yml file'
    );
  });
});

describe('serverless project roles', () => {
  const roleFiles = readdirSync(SERVERLESS_ROLES_ROOT_PATH, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('roles.yml'))
    .map((path) => resolve(SERVERLESS_ROLES_ROOT_PATH, path));

  it.each(roleFiles)('%s can be read as role names and API-ready descriptors', (roleFile) => {
    expect(readRolesFromResource(roleFile).length).toBeGreaterThan(0);

    const descriptors = Object.values(readRolesDescriptorsFromResource(roleFile)) as Array<{
      metadata?: Record<string, unknown>;
    }>;
    for (const { metadata = {} } of descriptors) {
      expect(Object.keys(metadata).filter((key) => key.startsWith('_'))).toEqual([]);
    }
  });

  // Serverless Elasticsearch only exposes a predefined role through the Query Role API when it is
  // marked `_public`, as in the elasticsearch-controller role definitions these files mirror.
  it.each(roleFiles)('%s marks predefined roles as public and reserved', (roleFile) => {
    const roles = parseYaml(readFileSync(roleFile, 'utf8')) as Record<
      string,
      { metadata?: Record<string, unknown> }
    >;
    const unmarkedRoles = Object.entries(roles)
      .filter(([name]) => !TEST_ONLY_ROLES.includes(name))
      .filter(([, { metadata }]) => metadata?._public !== true || metadata?._reserved !== true)
      .map(([name]) => name);

    expect(unmarkedRoles).toEqual([]);
  });
});
