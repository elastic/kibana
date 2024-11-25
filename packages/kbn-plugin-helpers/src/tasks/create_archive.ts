/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import archiver from 'archiver';
import del from 'del';

import { TaskContext } from '../task_context';

export async function createArchive({ kibanaVersion, plugin, log }: TaskContext) {
  const {
    manifest: { id },
    directory,
  } = plugin;

  const zipName = `${id}-${kibanaVersion}.zip`;
  log.info(`compressing plugin into [${zipName}]`);

  const buildDir = Path.resolve(directory, 'build');

  // zip up the build files
  const output = Fs.createWriteStream(Path.resolve(buildDir, zipName));
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);

  const directoryToAdd = Path.resolve(buildDir, 'kibana');
  const directoryNameOnZip = Path.basename(directoryToAdd);

  await archive.directory(directoryToAdd, directoryNameOnZip).finalize();

  // delete the files that were zipped
  await del(Path.resolve(buildDir, 'kibana'));
  log.success('plugin archive created');
}
