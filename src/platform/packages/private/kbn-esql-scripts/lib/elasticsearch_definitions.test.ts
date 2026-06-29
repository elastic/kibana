/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import { join } from 'path';
import {
  ELASTICSEARCH_ESQL_KIBANA_ROOT,
  findDefinitionFileByName,
  readElasticsearchDefinitions,
} from './elasticsearch_definitions';

jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;
const pathToElasticsearch = '/es/repo';
const generatedRoot = join(pathToElasticsearch, ELASTICSEARCH_ESQL_KIBANA_ROOT, 'generated');

const mockReaddir = (...entries: Array<{ name: string; dir: boolean }>) =>
  entries.map(({ name, dir }) => ({
    name,
    isDirectory: () => dir,
    isFile: () => !dir,
  })) as unknown as ReturnType<typeof fs.readdirSync>;

/**
 * Mocks `fs.readdirSync` against a directory tree keyed by absolute path, so recursive
 * traversals resolve deterministically regardless of order.
 */
const mockReaddirByPath = (tree: Record<string, Array<{ name: string; dir: boolean }>>) => {
  mockedFs.readdirSync.mockImplementation(
    (dir) => mockReaddir(...(tree[dir as string] ?? [])) as any
  );
};

/** Mocks similar structure to the Elasticsearch scaffolding.
 * - x-pack-esql
 *   - definition
 *     - functions
 *       - mv_max.json
 * - x-pack-esql-function-math
 *   - definition
 *     - functions
 *       - abs.json
 */
function mockElasticsearchScaffolding() {
  const esqlFunctionsDir = join(generatedRoot, 'x-pack-esql', 'definition', 'functions');
  const mathFunctionsDir = join(
    generatedRoot,
    'x-pack-esql-function-math',
    'definition',
    'functions'
  );

  mockedFs.existsSync.mockReturnValue(true);
  mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
  mockedFs.readdirSync
    .mockReturnValueOnce(
      mockReaddir(
        { name: 'x-pack-esql', dir: true },
        { name: 'x-pack-esql-function-math', dir: true }
      )
    )
    .mockReturnValueOnce(mockReaddir({ name: 'mv_max.json', dir: false }))
    .mockReturnValueOnce(mockReaddir({ name: 'abs.json', dir: false }));
  mockedFs.readFileSync
    .mockReturnValueOnce(
      JSON.stringify({ type: 'scalar', name: 'mv_max', description: 'Returns the maximum value.' })
    )
    .mockReturnValueOnce(
      JSON.stringify({
        comment: 'generated',
        type: 'scalar',
        name: 'abs',
        description: 'Returns the absolute value.',
      })
    );

  return { esqlFunctionsDir, mathFunctionsDir };
}

describe('readElasticsearchDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('merges function definitions from multiple folders', () => {
    mockElasticsearchScaffolding();

    expect(
      readElasticsearchDefinitions({
        pathToElasticsearch,
        keywordType: 'functions',
        language: 'esql',
      })
    ).toEqual([
      { type: 'scalar', name: 'abs', description: 'Returns the absolute value.' },
      { type: 'scalar', name: 'mv_max', description: 'Returns the maximum value.' },
    ]);
  });

  it('throws when pathToElasticsearch is missing', () => {
    expect(() =>
      readElasticsearchDefinitions({
        pathToElasticsearch: '',
        keywordType: 'functions',
        language: 'esql',
      })
    ).toThrow('Path to Elasticsearch is required');

    expect(mockedFs.readdirSync).not.toHaveBeenCalled();
  });

  it('throws when the generated definitions directory is missing', () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() =>
      readElasticsearchDefinitions({
        pathToElasticsearch,
        keywordType: 'functions',
        language: 'esql',
      })
    ).toThrow('Could not find the Elasticsearch generated definitions directory');
  });

  it('throws when no definitions are found', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    // Generated root exists but contains no projects.
    mockedFs.readdirSync.mockReturnValue(mockReaddir());

    expect(() =>
      readElasticsearchDefinitions({
        pathToElasticsearch,
        keywordType: 'functions',
        language: 'esql',
      })
    ).toThrow('No esql functions definitions found');
  });
});

describe('findDefinitionFileByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('locates a file nested under any project directory', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockReaddirByPath({
      [generatedRoot]: [
        { name: 'x-pack-esql-function-math', dir: true },
        { name: 'x-pack-esql', dir: true },
      ],
      [join(generatedRoot, 'x-pack-esql-function-math')]: [{ name: 'definition', dir: true }],
      [join(generatedRoot, 'x-pack-esql-function-math', 'definition')]: [
        { name: 'functions', dir: true },
      ],
      [join(generatedRoot, 'x-pack-esql-function-math', 'definition', 'functions')]: [
        { name: 'abs.json', dir: false },
      ],
      [join(generatedRoot, 'x-pack-esql')]: [{ name: 'definition', dir: true }],
      [join(generatedRoot, 'x-pack-esql', 'definition')]: [
        { name: 'inline_cast.json', dir: false },
      ],
    });

    expect(
      findDefinitionFileByName({
        pathToElasticsearch,
        language: 'esql',
        fileName: 'inline_cast.json',
      })
    ).toBe(join(generatedRoot, 'x-pack-esql', 'definition', 'inline_cast.json'));
  });

  it('throws when the generated definitions directory is missing', () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() =>
      findDefinitionFileByName({
        pathToElasticsearch,
        language: 'esql',
        fileName: 'inline_cast.json',
      })
    ).toThrow('Could not find the Elasticsearch generated definitions directory');
  });

  it('throws when the file cannot be found anywhere under the generated root', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockReaddirByPath({
      [generatedRoot]: [{ name: 'x-pack-esql', dir: true }],
      [join(generatedRoot, 'x-pack-esql')]: [{ name: 'definition', dir: true }],
      [join(generatedRoot, 'x-pack-esql', 'definition')]: [{ name: 'functions', dir: true }],
      [join(generatedRoot, 'x-pack-esql', 'definition', 'functions')]: [
        { name: 'abs.json', dir: false },
      ],
    });

    expect(() =>
      findDefinitionFileByName({
        pathToElasticsearch,
        language: 'esql',
        fileName: 'inline_cast.json',
      })
    ).toThrow('Could not find "inline_cast.json"');
  });
});
