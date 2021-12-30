/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import dedent from 'dedent';
import { run, createFailError } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

const DEFAULT_DOC_REPO_PATH = Path.resolve(REPO_ROOT, '..', 'docs');

const rel = (path: string) => Path.relative(process.cwd(), path);

export function runBuildDocsCli() {
  run(
    async ({ flags, procRunner }) => {
      const docRepoPath =
        typeof flags.docrepo === 'string' && flags.docrepo
          ? Path.resolve(process.cwd(), flags.docrepo)
          : DEFAULT_DOC_REPO_PATH;

      try {
        await procRunner.run('build_docs', {
          cmd: rel(Path.resolve(docRepoPath, 'build_docs')),
          args: [
            ['--doc', rel(Path.resolve(REPO_ROOT, 'docs/index.asciidoc'))],
            ['--chunk', '1'],
            flags.open ? ['--open'] : [],
          ].flat(),
          cwd: REPO_ROOT,
          wait: true,
        });
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw createFailError(dedent`
            Unable to run "build_docs" script from docs repo.
              Does it exist at [${rel(docRepoPath)}]?
              Do you need to pass --docrepo to specify the correct path or clone it there?
          `);
        }

        throw error;
      }
    },
    {
      description: 'Build the docs and serve them from a docker container',
      flags: {
        string: ['docrepo'],
        boolean: ['open'],
        default: {
          docrepo: DEFAULT_DOC_REPO_PATH,
        },
        help: `
          --docrepo [path]    Path to the doc repo, defaults to ${rel(DEFAULT_DOC_REPO_PATH)}
          --open              Automatically open the built docs in your default browser after building
        `,
      },
    }
  );
}
