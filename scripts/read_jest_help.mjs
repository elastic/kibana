/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

const FLAGS_FILE = 'packages/kbn-test/src/jest/jest_flags.json';

function readStdin() {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let timer = setTimeout(() => {
      reject(
        createFailError('you must pipe the output of `yarn jest --help` to this script', {
          showHelp: true,
        })
      );
    }, 1000);

    process.stdin
      .on('data', (chunk) => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }

        buffer += chunk;
      })
      .on('end', () => resolve(buffer))
      .on('error', reject);
  });
}

run(
  async ({ log }) => {
    const lines = (await readStdin()).split('\n');

    /** @type {{ string: string[], boolean: string[], alias: Record<string, string> }} */
    const flags = { string: [], boolean: [], alias: {} };

    /** @type {string | undefined} */
    let currentFlag;

    for (const line of lines) {
      const flagMatch = line.match(/^\s+(?:-(\w), )?--(\w+)\s+/);
      const typeMatch = line.match(/\[(boolean|string|array|number|choices: [^\]]+)\]/);

      if (flagMatch && currentFlag) {
        throw createFailError(`unable to determine type for flag [${currentFlag}]`);
      }

      if (flagMatch) {
        currentFlag = flagMatch[2];
        if (flagMatch[1]) {
          flags.alias[flagMatch[1]] = flagMatch[2];
        }
      }

      if (currentFlag && typeMatch) {
        switch (typeMatch[1]) {
          case 'string':
          case 'array':
          case 'number':
            flags.string.push(currentFlag);
            break;
          case 'boolean':
            flags.boolean.push(currentFlag);
            break;
          default:
            if (typeMatch[1].startsWith('choices: ')) {
              flags.string.push(currentFlag);
              break;
            }

            throw createFailError(`unexpected flag type [${typeMatch[1]}]`);
        }
        currentFlag = undefined;
      }
    }

    await Fsp.writeFile(
      Path.resolve(REPO_ROOT, FLAGS_FILE),
      JSON.stringify(
        {
          string: flags.string.sort(function (a, b) {
            return a.localeCompare(b);
          }),
          boolean: flags.boolean.sort(function (a, b) {
            return a.localeCompare(b);
          }),
          alias: Object.fromEntries(
            Object.entries(flags.alias).sort(function (a, b) {
              return a[0].localeCompare(b[0]);
            })
          ),
        },
        null,
        2
      )
    );

    log.success('wrote jest flag info to', FLAGS_FILE);
    log.warning('make sure you bootstrap to rebuild @kbn/test');
  },
  {
    usage: `yarn jest --help | node scripts/read_jest_help.mjs`,
    description: `
      Jest no longer exposes the ability to parse CLI flags externally, so we use this
      script to read the help output and convert it into parameters we can pass to getopts()
      which will parse the flags similar to how Jest does it.

      getopts() doesn't support things like enums, or number flags, but if we use the generated
      config then it will at least interpret which flags are expected, which are invalid, and
      allow us to determine the correct config path based on the provided path while passing
      the rest of the args directly to jest.
    `,
    flags: {
      allowUnexpected: true,
      guessTypesForUnexpectedFlags: false,
    },
  }
);
