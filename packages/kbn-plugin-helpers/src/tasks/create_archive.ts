/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

import del from 'del';
import vfs from 'vinyl-fs';
import zip from 'gulp-zip';

import { BuildContext } from '../build_context';

const asyncPipeline = promisify(pipeline);

export async function createArchive({ kibanaVersion, plugin, log }: BuildContext) {
  const {
    manifest: { id },
    directory,
  } = plugin;

  const zipName = `${id}-${kibanaVersion}.zip`;
  log.info(`compressing plugin into [${zipName}]`);

  const buildDir = Path.resolve(directory, 'build');

  // zip up the build files
  await asyncPipeline(
    vfs.src([`kibana/${id}/**/*`], {
      cwd: buildDir,
      base: buildDir,
      dot: true,
    }),
    zip(zipName),
    vfs.dest(buildDir)
  );

  // delete the files that were zipped
  await del(Path.resolve(buildDir, 'kibana'));
}
