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

  it('exits when pathToElasticsearch is missing', () => {
    // process.exit normally halts execution; in the test we make it throw so the function
    // aborts the same way and we can assert it never reached the filesystem read.
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as typeof process.exit);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      readElasticsearchDefinitions({
        pathToElasticsearch: '',
        keywordType: 'functions',
        language: 'esql',
      })
    ).toThrow('process.exit called');

    expect(errorSpy).toHaveBeenCalledWith('Error: Path to Elasticsearch is required.');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockedFs.readdirSync).not.toHaveBeenCalled();
  });
});
