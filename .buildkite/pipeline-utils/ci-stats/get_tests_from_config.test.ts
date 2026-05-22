/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import * as globby from 'globby';

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * Extensions covered by the glob in filterEmptyJestConfigs.
 * If a jest config uses a testMatch/testRegex that doesn't end in one of these,
 * the fast glob could miss test files and silently skip the config in CI.
 */
const COVERED_EXTENSIONS = /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/;

describe('filterEmptyJestConfigs glob coverage', () => {
  const allConfigs = globby.sync(['**/jest.config.js', '!**/__fixtures__/**'], {
    cwd: REPO_ROOT,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  it('found jest configs to validate', () => {
    expect(allConfigs.length).toBeGreaterThan(100);
  });

  it('every jest config testMatch/testRegex is covered by the glob patterns', () => {
    const uncovered: string[] = [];

    for (const configPath of allConfigs) {
      let config: Record<string, unknown>;
      try {
        config = require(configPath);
      } catch {
        continue;
      }

      const testMatch = config.testMatch as string[] | undefined;
      const testRegex = config.testRegex as string | string[] | undefined;

      if (testMatch) {
        for (const pattern of testMatch) {
          // Extract the file extension portion from the glob pattern
          const extMatch = pattern.match(/\*\.([\w|{},]+)$/);
          if (extMatch) {
            const extensions = extMatch[1].replace(/[{}]/g, '').split(',');
            for (const ext of extensions) {
              const testFilename = `example.test.${ext}`;
              if (!COVERED_EXTENSIONS.test(testFilename)) {
                const specFilename = `example.spec.${ext}`;
                if (!COVERED_EXTENSIONS.test(specFilename)) {
                  uncovered.push(
                    `${path.relative(
                      REPO_ROOT,
                      configPath
                    )}: testMatch extension ".${ext}" not covered`
                  );
                }
              }
            }
          }
        }
      }

      if (testRegex) {
        const regexes = Array.isArray(testRegex) ? testRegex : [testRegex];
        for (const regex of regexes) {
          // Verify the regex would match files ending in .test.ts or .spec.ts etc.
          const sampleFiles = [
            'foo.test.ts',
            'foo.test.tsx',
            'foo.test.js',
            'foo.test.jsx',
            'foo.test.mjs',
            'foo.spec.ts',
          ];
          const re = new RegExp(regex);
          const anyMatch = sampleFiles.some((f) => re.test(f));
          if (!anyMatch) {
            uncovered.push(
              `${path.relative(
                REPO_ROOT,
                configPath
              )}: testRegex "${regex}" doesn't match standard test file names`
            );
          }
        }
      }
    }

    if (uncovered.length > 0) {
      fail(
        `The following jest configs use patterns not covered by filterEmptyJestConfigs glob.\n` +
          `Update TEST_FILE_PATTERNS in get_tests_from_config.ts to cover them:\n\n` +
          uncovered.map((u) => `  - ${u}`).join('\n')
      );
    }
  });
});
