/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { RepoSourceClassifier } from '@kbn/repo-source-classifier';
import { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import { getRepoFiles } from '@kbn/get-repo-files';
import { run } from '@kbn/dev-cli-runner';

import { TypeTree } from './src/type_tree';

run(
  async ({ flagsReader }) => {
    const resolver = ImportResolver.create(REPO_ROOT);
    const classifier = new RepoSourceClassifier(resolver);

    const include = flagsReader.getPositionals().length
      ? flagsReader.getPositionals().map((p) => Path.resolve(p))
      : [process.cwd()];

    const exclude = (flagsReader.arrayOfStrings('exclude') ?? []).map((p) => Path.resolve(p));

    const typeFlags = String(flagsReader.string('types'))
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

    if (flagsReader.boolean('flat')) {
      for (const file of tree.toList()) {
        process.stdout.write(`${file}\n`);
      }
    } else {
      process.stdout.write(tree.print({ expand: flagsReader.boolean('expand') }));
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
