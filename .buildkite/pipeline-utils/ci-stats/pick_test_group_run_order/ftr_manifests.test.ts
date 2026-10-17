/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('../../load_buildkite_json.ts', () => ({
  loadBuildkiteJson: jest.fn(() =>
    jest.requireActual('../../../ftr-manifests/ftr_configs_manifests.json')
  ),
}));

import { readFileSync } from 'node:fs';
import type * as NodeFs from 'node:fs';
import * as path from 'node:path';
import { getKibanaDir } from '../../get_kibana_dir.ts';
import { ftrManifest } from './ftr_manifests.ts';
import { ftrTestChannel } from './test_channels.ts';

const { readFileSync: actualReadFileSync } = jest.requireActual<typeof NodeFs>('node:fs');

describe('ftrTestChannel.fromString', () => {
  it('throws for an unknown channel', () => {
    expect(() => ftrTestChannel.fromString('not-a-channel')).toThrow(
      "Failed to find matching FTR test channel for string 'not-a-channel'"
    );
  });
});

describe('ftrManifest.entries.fromFile', () => {
  it('applies queue and testChannels overrides from an object-form entry', () => {
    (readFileSync as jest.Mock).mockReturnValueOnce(`
enabled:
  - some/config.ts:
      queue: n2-8-spot
      testChannels:
        - ci-batch-daily
`);

    const [entry] = ftrManifest.entries.fromFile('ftr_security_stateful_configs.yml');

    expect(entry.queue).toBe('n2-8-spot');
    expect(entry.testChannels).toEqual(new Set(['ci-batch-daily']));
  });
});

describe('ftr_base_serverless_configs.yml', () => {
  // `serverlessProject` value in an FTR config → FTR manifest domain of that solution.
  const DOMAIN_BY_SERVERLESS_PROJECT: Record<string, string> = {
    es: 'search',
    oblt: 'observability',
    security: 'security',
    vectordb: 'vectordb',
    workplaceai: 'workplaceai',
  };

  it("declares each enabled entry's project as the solution of its serverlessProject", () => {
    (readFileSync as jest.Mock).mockImplementation(actualReadFileSync);
    const kibanaDir = getKibanaDir();

    const mismatches = ftrManifest.entries
      .fromFile(path.resolve(kibanaDir, '.buildkite/ftr-manifests/ftr_base_serverless_configs.yml'))
      .filter((entry) => entry.enabled)
      .flatMap((entry) => {
        const source = actualReadFileSync(path.resolve(kibanaDir, entry.path), 'utf8');
        const serverlessProject = source.match(/serverlessProject:\s*['"](\w+)['"]/)?.[1];
        const expected = serverlessProject && DOMAIN_BY_SERVERLESS_PROJECT[serverlessProject];
        return entry.project !== undefined && entry.project === expected
          ? []
          : [`${entry.path}: project=${entry.project}, serverlessProject=${serverlessProject}`];
      });

    expect(mismatches).toEqual([]);
  });
});
