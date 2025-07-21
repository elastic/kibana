/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import Path from 'path';
import { promises as fs, mkdtempSync, watch } from 'fs';
import { Config } from '@jest/types';
import { AggregatedResult } from '@jest/test-result';
import { Subject, firstValueFrom, lastValueFrom, shareReplay, toArray } from 'rxjs';
import { readFileSync } from 'fs';
import Os from 'os';
import { createBlazeJestConfig } from './config/create_blaze_jest_config';

const fixturesDir = Path.join(__dirname, '__fixtures__');

let tmpDir: string;

// write results to a tmp file, outside of `tmpDir` to prevent
// file watch from being triggered
const testResultsFile = Path.join(Os.tmpdir(), 'jest-results.json');

// Helper functions for managing test packages in tmpdir
async function writeFiles(files: Record<string, string>, includeFixtures: boolean = true) {
  for (const [key, content] of Object.entries({
    ...files,
    'global_setup.js': `module.exports = function () {
        require('${require.resolve('../../../../../setup_node_env')}');
      };`,
  })) {
    const fullPath = Path.join(tmpDir, key);

    const dirPath = Path.dirname(fullPath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf8');
  }

  if (includeFixtures) {
    const fixtures = await fs.readdir(fixturesDir);
    await Promise.all(
      fixtures.map(async (filename) => {
        const file = Path.join(fixturesDir, filename);
        const stat = await fs.stat(file);
        if (stat.isFile()) {
          await fs.copyFile(file, Path.join(tmpDir, filename));
        }
      })
    );
  }
}

async function bootstrapFiles() {
  tmpDir = mkdtempSync(Path.join(REPO_ROOT, 'data', 'kbn-jest-transformer-test-'));
  // --watch only works with a git repo
  await execa.command(`git init`, { cwd: tmpDir });
}

async function cleanFiles() {
  if (tmpDir) {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

function getJestConfig(testName: string): Config.InitialOptions {
  const base: Config.InitialOptions = {
    rootDir: tmpDir,
    testEnvironment: 'node',
    testMatch: [Path.join(tmpDir, testName)],
    roots: [tmpDir],
    globalSetup: require.resolve(Path.join(tmpDir, 'global_setup')),
    moduleDirectories: [tmpDir, REPO_ROOT, Path.join(REPO_ROOT, 'node_modules')],
  };
  return createBlazeJestConfig(base);
}

async function runJest(jestConfig: Config.InitialOptions) {
  const cmd = `yarn run jest --config ${JSON.stringify(
    jestConfig
  )} --no-cache --runInBand --json --outputFile=${testResultsFile}`;

  const output = await execa
    .command(cmd, {
      cwd: REPO_ROOT,
      all: true,
      env: {
        NODE_OPTIONS: `--require ${require.resolve(
          '../../../../../setup_node_env'
        )} --experimental-vm-modules --no-warnings`,
      },
    })
    .catch((error) => {
      throw Error(`Jest run failed: ${error.shortMessage}`, { cause: error });
    });

  try {
    const results = JSON.parse(await fs.readFile(testResultsFile, 'utf8')) as AggregatedResult;
    return {
      output: output.all,
      results,
      exitCode: output.exitCode,
    };
  } catch (error) {
    throw new Error(`Failed to parse results from ${testResultsFile}`, { cause: error });
  } finally {
    await fs.unlink(testResultsFile).catch(() => {});
  }
}

/**
 * These files copy over the test files in ./__fixtures__,
 * and create additional mock files to be able to test the
 * rewrites.
 */
describe('jestTransformer - Import Rewriter Integration', () => {
  beforeEach(async () => {
    await bootstrapFiles();
  });

  afterEach(async () => {
    // Clean up test packages
    await cleanFiles();
  });

  it('rewrites simple re-export (barrel) imports correctly', async () => {
    // Create source file and barrel file
    const files = {
      'a.ts': `export const foo = 'foo';`,
      'b.ts': `export const { foo } from './a';`,
      'barrel.ts': `export { foo } from './a';`,
    };
    await writeFiles(files);

    const jestConfig = getJestConfig('barrel.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    expect(exitCode).toBe(0);
    expect(output).toContain('Barrel Import Test');

    expect(results.numPassedTests).toBeGreaterThan(0);
    expect(results.numFailedTests).toBe(0);
  });

  it('handles renamed re-exports (should not rewrite)', async () => {
    // Create source file with renamed export
    const files = {
      'a.ts': `export const foo = 'foo';`,
      'barrel.ts': `export { foo as bar } from './a';`,
    };
    await writeFiles(files);

    const jestConfig = getJestConfig('renamed.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    // Verify that Jest ran successfully (renamed exports should not be rewritten)
    expect(exitCode).toBe(0);
    expect(results.numPassedTests).toBeGreaterThan(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Renamed Re-export Test');
  });

  it('rewrites wildcard re-exports correctly', async () => {
    // Create source file with multiple exports and wildcard barrel
    const files = {
      'a.ts': `export const foo = 'foo';\nexport const baz = 'baz';`,
      'barrel.ts': `export * from './a';`,
    };
    await writeFiles(files);

    const jestConfig = getJestConfig('wildcard.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    // Verify that Jest ran successfully
    expect(exitCode).toBe(0);
    expect(results.numPassedTests).toBeGreaterThan(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Wildcard Re-export Test');
  });

  it('handles complex nested barrel scenarios', async () => {
    // Create nested barrel structure
    const files = {
      'deep/source.ts': `export const deepValue = 'deep';`,
      'mid/barrel.ts': `export { deepValue } from '../deep/source';`,
      'barrel.ts': `export { deepValue } from './mid/barrel';`,
    };
    await writeFiles(files);

    const jestConfig = getJestConfig('nested.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    // Verify that Jest ran successfully
    expect(exitCode).toBe(0);
    expect(results.numPassedTests).toBeGreaterThan(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Nested Re-export Test');
  });

  it('handles mixed import patterns and module resolution', async () => {
    // Create files that test various import patterns
    const files = {
      'test-utils/index.ts': `export function someUtility() { return 'test utility'; }`,
      'helpers/helper.ts': `export function helperFunction() { return 'helper result'; }`,
      'some-package/index.ts': `export default { type: 'some-package', value: 42 };`,
      'another-package/index.ts': `export const namedExport = 'named';\nexport default 'default';`,
    };
    await writeFiles(files);

    const jestConfig = getJestConfig('basic_imports.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    // Verify that Jest ran successfully
    expect(exitCode).toBe(0);
    expect(results.numPassedTests).toBeGreaterThan(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Basic Import Tests');
  });

  it('handles complex import scenarios with multiple patterns', async () => {
    // Create complex file structure with various export patterns
    const files = {
      'multi-export-package/index.js': `
    export { FirstExport } from "../first-export";
    export { SecondExport } from "../second-export";
    export * from "../third-export";
    export { default as FourthExport } from "../fourth-export";
    export { FifthExport } from "../nested/fifth";
    export { SixthExport } from "../sixth-export";
    export { SeventhExport } from "../seventh-package";
  `,

      // unrelated modules to ensure they’re left untouched
      'async-module/index.js': `const foo = "foo";`,
      'utils/conditional-helper/index.js': `
    // should not be rewritten since it’s not exporting any of the seven
    export const helper = process.env.USE_HELPER
      ? require('../../async-module').foo
      : null;
  `,

      // FirstExport: direct two‑level re‑export
      'first-export/index.js': `
    export { FirstExport } from "./models/first-export";
  `,
      'first-export/models/first-export/index.js': `
    export function FirstExport() {
      return "first";
    }
  `,

      // SecondExport: simple named re‑export
      'second-export/index.js': `
    export { SecondExport } from "../src/second-export";
  `,
      'src/second-export/index.js': `
    export const SecondExport = () => "second";
  `,

      // ThirdExport: wildcard re‑export
      'third-export/index.js': `
    export * from "../nested/third";
  `,
      'nested/third/index.js': `
    export const ThirdExport = () => "third";
  `,

      // FourthExport: default re‑export under a new name
      'fourth-export/index.js': `
    export { default } from "../deep/fourth";
  `,
      'deep/fourth/index.js': `
    export default function FourthExport() {
      return "fourth";
    }
  `,

      // FifthExport: nested index file
      'nested/fifth/index.js': `
    export { FifthExport } from "./fifth-helper/index.js";
  `,
      'nested/fifth/fifth-helper/index.js': `
    export const FifthExport = "fifth";
  `,

      // SixthExport: re‑export from a sibling “index”
      'sixth-export/index.js': `
    export * from "../sixth/index";
  `,
      'sixth/index.js': `
    export const SixthExport = 6;
  `,

      // SeventhExport: deeper package‑style re‑export
      'seventh-package/index.js': `
    export { SeventhExport } from "./lib/seventh";
  `,
      'seventh-package/lib/seventh/index.js': `
    export function SeventhExport() {
      return "seventh";
    }
  `,
    };

    await writeFiles(files);

    const jestConfig = getJestConfig('complex_imports.mock_test.ts');
    const { exitCode, output, results } = await runJest({
      ...jestConfig,
    });

    // Verify that Jest ran successfully
    expect(exitCode).toBe(0);
    expect(results.numPassedTests).toBeGreaterThan(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Complex Import Patterns');
  });

  it('runs mixed fixture (barrel: named + default)', async () => {
    const files = {
      'a.ts': `export const namedExport = 'named';\nexport const anotherNamed = 'another';`,
      'defaultSource.ts': `export default { default: 'value' };`,
      'barrel.ts': `export { namedExport, anotherNamed } from './a';\nexport { default } from './defaultSource';`,
    };
    await writeFiles(files);

    const jestConfig = getJestConfig('mixed.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    expect(exitCode).toBe(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Mixed Import Test');
  });

  it('runs exports fixture (re-exports and classes)', async () => {
    const files = {
      'lib/processing.ts': `export function process(input: string) { return 'processed: ' + input; }`,
      'lib/constants.ts': `export const REEXPORTED_CONSTANT = 'CONSTANT_VALUE';`,
      'reexport-package.ts': `export { process as reexportedFunction } from './lib/processing';\nexport { REEXPORTED_CONSTANT as reexportedConstant } from './lib/constants';`,
      'modules/exported-class.ts': `export class ExportedClass { constructor(private v: string) {} getValue() { return this.v; } }`,
      'default-source.ts': `export default { key: 'value' };`,
      'default-reexport.ts': `export { default } from './default-source';`,
      'source-package.ts': `export function someFunction(s: string) { return 'processed: ' + s; }`,
      'wildcard-source.ts': `export const star = 1;`,
      'wildcard-package.ts': `export * from './wildcard-source';`,
      'default-source-2.ts': `export default 'pt';`,
      'default-passthrough.ts': `export { default as pt } from './default-source-2';`,
    };

    await writeFiles(files);

    const jestConfig = getJestConfig('exports.mock_test.ts');
    const { exitCode, output, results } = await runJest(jestConfig);

    expect(exitCode).toBe(0);
    expect(results.numFailedTests).toBe(0);
    expect(output).toContain('Export and Re-export Tests');
  });

  it('invalidates cache correctly in watch mode when dependencies change', async () => {
    // this test verifies that for rewrites, a change in a test file (reexport.js)
    // that was skipped over after the rewrite, still correctly invalidates the graph
    const tempFiles = {
      'entry.js': `
        import { testValue } from './reexport.js';
        export { testValue };
      `,
      'reexport.js': `
        export { testValue } from './source_a.js';
      `,
      'source_a.js': `
        export const testValue = 'FAIL'; // This should cause test to fail initially
      `,
      'source_b.js': `
        export const testValue = 'PASS'; // This should cause test to pass after change
      `,
      'watch_test.test.js': `
        import { testValue } from './entry.js';
        
        test('cache invalidation test', () => {
          expect(testValue).toBe('PASS');
        });
      `,
    };

    // don't include fixtures - just these files
    await writeFiles(tempFiles, false);

    const baseWatchConfig: Config.InitialOptions = createBlazeJestConfig({
      rootDir: tmpDir,
      testEnvironment: 'node',
      testMatch: [Path.join(tmpDir, 'watch_test.test.js')],
      roots: [tmpDir],
      modulePaths: [tmpDir],
      globalSetup: Path.join(tmpDir, 'global_setup'),
      moduleDirectories: [tmpDir, Path.join(REPO_ROOT, 'node_modules')],
      watchPathIgnorePatterns: ['/node_modules/'],
    });

    const jestConfig = createBlazeJestConfig(baseWatchConfig);

    await fs.writeFile(testResultsFile, '{}', 'utf8');

    const results$ = new Subject<AggregatedResult>();

    const resultsShared$ = results$.pipe(shareReplay());

    const allResults$ = results$.pipe(toArray());

    const watcher = watch(testResultsFile);

    watcher.on('change', () => {
      try {
        const resultsContent = readFileSync(testResultsFile, 'utf8');

        const results = JSON.parse(resultsContent) as AggregatedResult;

        results$.next(results);

        if (results.numPassedTests > 0) {
          watcher.close();
          results$.complete();
        }
      } catch (e) {
        // ignore parse errors while file is being written
      }
    });

    watcher.on('error', (error) => {
      watcher.close();
      results$.error(error);
    });

    // Start Jest in watch mode
    const cmd = `yarn run jest --config ${JSON.stringify(
      jestConfig
    )} --no-cache --runInBand  --watch --json --outputFile=${testResultsFile}`;

    // Start Jest process
    const jestProcess = execa.command(cmd, {
      cwd: REPO_ROOT,
      all: true,
      env: {
        NODE_OPTIONS: `--require ${require.resolve(
          '../../../../../setup_node_env'
        )} --experimental-vm-modules --no-warnings`,
      },
    });

    await firstValueFrom(resultsShared$);

    // Now change reexport.js to import from source_b.js instead
    const updatedReexport = `
        export { testValue } from './source_b.js';
      `;

    // Update the dependency file in tmpDir
    await fs.writeFile(Path.join(tmpDir, 'reexport.js'), updatedReexport, 'utf8');

    try {
      const allResults = await lastValueFrom(allResults$);

      const finalResult = allResults[allResults.length - 1];

      expect(finalResult.numPassedTests).toBeGreaterThan(0);
      expect(finalResult.numFailedTests).toBe(0);
    } finally {
      watcher.close();

      // Clean up: kill Jest process
      jestProcess.kill('SIGTERM');

      try {
        await jestProcess;
      } catch {
        // Process was killed, this is expected
      }

      // Clean up results file
      await fs.unlink(testResultsFile).catch(() => {});
    }
  });
});
