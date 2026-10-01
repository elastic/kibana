/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';

import vfs from 'vinyl-fs';
import prettier from 'prettier';
import { REPO_ROOT } from '@kbn/repo-info';
import { transformFileStream } from '@kbn/dev-utils';
import ejs from 'ejs';
import { Minimatch } from 'minimatch';

import { snakeCase, camelCase, upperCamelCase } from './casing';
import type { Answers } from './ask_questions';

const asyncPipeline = promisify(pipeline);

const excludeFiles = (globs: string[]) => {
  const patterns = globs.map(
    (g) =>
      new Minimatch(g, {
        matchBase: true,
      })
  );

  return transformFileStream((file) => {
    const path = file.relative.replace(/\.ejs$/, '');
    const exclude = patterns.some((p) => p.match(path));
    if (exclude) {
      return null;
    }
  });
};

/**
 * vinyl-fs 4 still emits directories (nodir is ignored). transformFileStream
 * passes them through, and dest would otherwise write empty classic/ and di/.
 */
const dropDirectories = () =>
  new Transform({
    objectMode: true,
    transform(file, _, cb) {
      if (file.isDirectory()) {
        cb();
      } else {
        cb(undefined, file);
      }
    },
  });

/**
 * Strip the selected template tree (`classic/` or `di/`) so generated plugins
 * still use `server/` and `public/` at the plugin root.
 */
const stripTemplateDir = (templateDir: 'classic' | 'di') =>
  transformFileStream((file) => {
    const prefix = `${templateDir}/`;
    if (!file.relative.startsWith(prefix)) {
      return;
    }

    file.path = Path.join(file.base, file.relative.slice(prefix.length));
  });

/**
 * Stream all the files from the template directory, ignoring
 * certain files based on the answers, process the .ejs templates
 * to the output files they represent, renaming the .ejs files to
 * remove that extension, then run every file through prettier
 * before writing the files to the output directory.
 */
export async function renderTemplates({
  outputDir,
  answers,
}: {
  outputDir: string;
  answers: Answers;
}) {
  const prettierConfig = await prettier.resolveConfig(process.cwd());
  const useDi = !!answers.di;

  const defaultTemplateData = {
    name: answers.name,

    hasServer: !!answers.server,
    hasUi: !!answers.ui,

    ownerName: answers.ownerName,
    githubTeam: answers.githubTeam,
    description: answers.description,

    camelCase,
    snakeCase,
    upperCamelCase,
  };

  await asyncPipeline(
    vfs.src(['**/*'], {
      dot: true,
      buffer: true,
      nodir: true,
      cwd: Path.resolve(__dirname, '../template'),
      encoding: false,
    }),

    // drop empty classic/ or di/ trees into the generated plugin
    dropDirectories(),

    // exclude the unused scaffold tree (paths still include classic/ or di/)
    excludeFiles([useDi ? 'classic/**' : 'di/**']),

    stripTemplateDir(useDi ? 'di' : 'classic'),

    // exclude unused sides; patterns match paths without the .ejs extension
    excludeFiles(
      ([] as string[]).concat(answers.ui ? [] : 'public/**/*', answers.server ? [] : 'server/**/*')
    ),

    // render .ejs templates and rename to not use .ejs extension
    transformFileStream((file) => {
      if (file.extname !== '.ejs') {
        return;
      }

      const templateData = {
        ...defaultTemplateData,
        importFromRoot(rootRelative: string) {
          const filesOutputDirname = Path.dirname(Path.resolve(outputDir, file.relative));
          const target = Path.resolve(REPO_ROOT, rootRelative);
          return Path.relative(filesOutputDirname, target);
        },
      };

      // render source and write back to file object
      file.contents = Buffer.from(
        ejs.render(file.contents.toString('utf8'), templateData, {
          beautify: false,
        })
      );

      // file.stem is the basename but without the extension
      file.basename = file.stem;
    }),

    // format each file with prettier
    transformFileStream((file) => {
      if (!file.extname) {
        return;
      }

      file.contents = Buffer.from(
        prettier.format(file.contents.toString('utf8'), {
          ...prettierConfig,
          filepath: file.path,
        })
      );
    }),

    // write files to disk
    vfs.dest(outputDir)
  );
}
