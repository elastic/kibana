/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { RepoSourceClassifier } from '@kbn/repo-source-classifier';
import { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import { getRepoFiles } from '@kbn/get-repo-files';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';

import { TypeTree } from './src/type_tree';

run(
  async ({ flags }) => {
    const resolver = ImportResolver.create(REPO_ROOT);
    const classifier = new RepoSourceClassifier(resolver);

    const include = flags._.length ? flags._ : [process.cwd()];
    let exclude;
    if (flags.exclude) {
      if (Array.isArray(flags.exclude)) {
        exclude = flags.exclude;
      } else if (typeof flags.exclude === 'string') {
        exclude = [flags.exclude];
      } else {
        throw createFlagError('expected --exclude value to be a string');
      }
    }

    const typeFlags = String(flags.types)
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const includeTypes: string[] = [];
    const excludeTypes: string[] = [];
    for (const type of typeFlags) {
      if (type.startsWith('!')) {
        excludeTypes.push(type.slice(1));
      } else {
        includeTypes.push(type);
      }
    }

    const tree = new TypeTree();
    const cwd = process.cwd();
    for (const { abs } of await getRepoFiles(include, exclude)) {
      const { type } = classifier.classify(abs);
      if ((includeTypes.length && !includeTypes.includes(type)) || excludeTypes.includes(type)) {
        continue;
      }

      tree.add(type, Path.relative(cwd, abs));
    }

    if (!!flags.flat) {
      for (const file of tree.toList()) {
        process.stdout.write(`${file}\n`);
      }
    } else {
      process.stdout.write(tree.print({ expand: !!flags.expand }));
    }
  },
  {
    description: 'run the repo-source-classifier on the source files and produce a report',
    usage: `node scripts/classify_source <...paths>`,
    flags: {
      string: ['exclude', 'types'],
      boolean: ['expand', 'flat'],
      help: `
        <...paths>         include paths to select specific files which should be reported
                            by default all files in the cwd are classified. Can be specified
                            multiple times
        --exclude          exclude specific paths from the classification. Can be specified
                            multiple times
        --types            limit the types reported to the types in this comma separated list
                            to exclude a type prefix it with !
        --expand           prevent collapsing entries that are of the same type
        --flat             just print file names
      `,
    },
  }
);
