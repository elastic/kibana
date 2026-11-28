/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

import vfs from 'vinyl-fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { transformFileStream } from '@kbn/dev-utils';
import { formatWithOxfmt } from '@kbn/oxfmt';
import ejs from 'ejs';
import { Minimatch } from 'minimatch';

import { snakeCase, camelCase, upperCamelCase } from './casing';
import { Answers } from './ask_questions';

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
 * Stream all the files from the template directory, ignoring
 * certain files based on the answers, process the .ejs templates
 * to the output files they represent, renaming the .ejs files to
 * remove that extension, then run every file through oxfmt
 * before writing the files to the output directory.
 */
export async function renderTemplates({
  outputDir,
  answers,
}: {
  outputDir: string;
  answers: Answers;
}) {
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

    // exclude files from the template based on selected options, patterns
    // are matched without the .ejs extension
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

    // format each file with oxfmt as if it lived at the same path inside the repo; JS/TS templates
    // get formatted, everything else (.json, .md) is outside the repo formatting scope and passes
    // through unchanged, so keep those templates hand-formatted
    transformFileStream(async (file) => {
      if (!file.extname) {
        return;
      }

      file.contents = Buffer.from(
        await formatWithOxfmt(file.relative, file.contents.toString('utf8'))
      );
    }),

    // write files to disk
    vfs.dest(outputDir)
  );
}
