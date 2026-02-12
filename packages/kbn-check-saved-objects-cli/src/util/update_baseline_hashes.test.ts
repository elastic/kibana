/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationSnapshot, MigrationInfoRecord } from '../types';
import { updateBaselineHashes } from './update_baseline_hashes';
import { takeSnapshot } from '../snapshots/take_snapshot';
import { fileToJson, jsonToFile } from './json';

jest.mock('../snapshots/take_snapshot', () => ({
  takeSnapshot: jest.fn(),
}));

jest.mock('./json', () => ({
  fileToJson: jest.fn(),
  jsonToFile: jest.fn(),
}));

const createType = (overrides: Partial<MigrationInfoRecord>): MigrationInfoRecord => ({
  name: 'type',
  migrationVersions: [],
  schemaVersions: [],
  mappings: {},
  hash: 'hash',
  modelVersions: [
    {
      version: '1',
      modelVersionHash: 'mv-hash',
      schemas: { create: 'schema-create', forwardCompatibility: 'schema-fc' },
      hasTransformation: false,
      newMappings: [],
      changeTypes: [],
    },
  ],
  ...overrides,
});

const createSnapshot = (typeDefinitions: Record<string, MigrationInfoRecord>): MigrationSnapshot => ({
  meta: {
    date: '2025-01-01T00:00:00.000Z',
    kibanaCommitHash: 'commit',
    buildUrl: null,
    pullRequestUrl: null,
    timestamp: 1,
  },
  typeDefinitions,
});

const getWrittenSnapshot = () => {
  const writtenValue = (jsonToFile as jest.Mock).mock.calls[0]?.[1] as string;
  return JSON.parse(writtenValue.trim()) as MigrationSnapshot;
};

describe('updateBaselineHashes', () => {
  const baselinePath = '/tmp/baseline_snapshot.json';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates hashes and schemas when they differ from a fresh snapshot', async () => {
    const baseline = createSnapshot({
      typeA: createType({
        name: 'typeA',
        hash: 'old-hash',
        modelVersions: [
          {
            version: '1',
            modelVersionHash: 'old-mv-hash',
            schemas: { create: 'old-create', forwardCompatibility: 'old-fc' },
            hasTransformation: false,
            newMappings: [],
            changeTypes: [],
          },
        ],
      }),
    });
    const fresh = createSnapshot({
      typeA: createType({
        name: 'typeA',
        hash: 'new-hash',
        modelVersions: [
          {
            version: '1',
            modelVersionHash: 'new-mv-hash',
            schemas: { create: 'new-create', forwardCompatibility: 'new-fc' },
            hasTransformation: false,
            newMappings: [],
            changeTypes: [],
          },
        ],
      }),
    });

    (fileToJson as jest.Mock).mockResolvedValue(baseline);
    (takeSnapshot as jest.Mock).mockResolvedValue(fresh);
    (jsonToFile as jest.Mock).mockResolvedValue(undefined);

    const { updated } = await updateBaselineHashes([], baselinePath);

    expect(updated).toEqual(['typeA']);
    expect(jsonToFile).toHaveBeenCalledTimes(1);
    const written = getWrittenSnapshot();
    expect(written.typeDefinitions.typeA.hash).toBe('new-hash');
    expect(written.typeDefinitions.typeA.modelVersions[0].modelVersionHash).toBe('new-mv-hash');
    expect(written.typeDefinitions.typeA.modelVersions[0].schemas).toEqual({
      create: 'new-create',
      forwardCompatibility: 'new-fc',
    });
  });

  it('does not write the file when nothing changed', async () => {
    const baseline = createSnapshot({
      typeA: createType({ name: 'typeA' }),
    });
    const fresh = createSnapshot({
      typeA: createType({ name: 'typeA' }),
    });

    (fileToJson as jest.Mock).mockResolvedValue(baseline);
    (takeSnapshot as jest.Mock).mockResolvedValue(fresh);

    const { updated } = await updateBaselineHashes([], baselinePath);

    expect(updated).toEqual([]);
    expect(jsonToFile).not.toHaveBeenCalled();
  });

  it('leaves baseline-only types untouched when missing from fresh snapshot', async () => {
    const baselineOnlyType = createType({
      name: 'baselineOnly',
      hash: 'baseline-hash',
      modelVersions: [
        {
          version: '1',
          modelVersionHash: 'baseline-mv',
          schemas: { create: 'baseline-create', forwardCompatibility: 'baseline-fc' },
          hasTransformation: false,
          newMappings: [],
          changeTypes: [],
        },
      ],
    });
    const baseline = createSnapshot({
      typeA: createType({ name: 'typeA', hash: 'old-hash' }),
      baselineOnly: baselineOnlyType,
    });
    const fresh = createSnapshot({
      typeA: createType({ name: 'typeA', hash: 'new-hash' }),
    });

    (fileToJson as jest.Mock).mockResolvedValue(baseline);
    (takeSnapshot as jest.Mock).mockResolvedValue(fresh);
    (jsonToFile as jest.Mock).mockResolvedValue(undefined);

    await updateBaselineHashes([], baselinePath);

    const written = getWrittenSnapshot();
    expect(written.typeDefinitions.baselineOnly).toEqual(baselineOnlyType);
  });

  it('returns the correct updated type names', async () => {
    const baseline = createSnapshot({
      typeA: createType({ name: 'typeA', hash: 'old-a' }),
      typeB: createType({ name: 'typeB', hash: 'same-b' }),
      typeC: createType({ name: 'typeC', hash: 'old-c' }),
    });
    const fresh = createSnapshot({
      typeA: createType({ name: 'typeA', hash: 'new-a' }),
      typeB: createType({ name: 'typeB', hash: 'same-b' }),
      typeC: createType({ name: 'typeC', hash: 'new-c' }),
    });

    (fileToJson as jest.Mock).mockResolvedValue(baseline);
    (takeSnapshot as jest.Mock).mockResolvedValue(fresh);
    (jsonToFile as jest.Mock).mockResolvedValue(undefined);

    const { updated } = await updateBaselineHashes([], baselinePath);

    expect(updated.sort()).toEqual(['typeA', 'typeC']);
  });
});
