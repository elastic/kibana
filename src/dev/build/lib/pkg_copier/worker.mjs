/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { constants as FsConstants } from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';

import { workerData } from 'piscina';

import * as Peggy from '@kbn/peggy';
import * as DotText from '@kbn/dot-text';
import { transformCode } from '@kbn/babel-transform';

const { transformConfig } = workerData;

const COPY_FLAGS = FsConstants.COPYFILE_EXCL | FsConstants.COPYFILE_FICLONE;
const FILE_MODE = 0o644;

async function handleCopy(record) {
  await Fsp.copyFile(record.srcAbs, record.destAbs, COPY_FLAGS);
  if ((record.srcMode & 0o111) !== 0) {
    await Fsp.chmod(record.destAbs, record.srcMode);
  }
}

async function handleTransformJs(record) {
  const source = await Fsp.readFile(record.srcAbs, 'utf8');
  const result = transformCode(record.srcAbs, source, transformConfig);
  await Fsp.writeFile(record.destAbs, result.code, { flag: 'wx', mode: FILE_MODE });
}

async function handleTransformPeggy(record, batch, peggyConfigOutputPaths) {
  const result = await Peggy.getJsSource({
    path: record.srcAbs,
    format: 'commonjs',
    optimize: 'speed',
  });

  if (result.config) {
    peggyConfigOutputPaths.push(
      Path.resolve(batch.pkgDistPath, Path.relative(batch.pkgSrcPath, result.config.path))
    );
  }

  await Fsp.writeFile(record.destAbs, result.source, { flag: 'wx', mode: FILE_MODE });
}

async function handleTransformText(record) {
  const result = await DotText.getJsSource({ path: record.srcAbs });
  await Fsp.writeFile(record.destAbs, result.source, { flag: 'wx', mode: FILE_MODE });
}

async function handleTransformYaml(record) {
  const yamlSource = await Fsp.readFile(record.srcAbs, 'utf8');
  const content = `module.exports = ${JSON.stringify(yamlSource)};\n`;
  await Fsp.writeFile(record.destAbs, content, { flag: 'wx', mode: FILE_MODE });
}

export default async function processBatch(batch) {
  const peggyConfigOutputPaths = [];

  for (const record of batch.records) {
    switch (record.kind) {
      case 'copy':
        await handleCopy(record);
        break;
      case 'transformJs':
        await handleTransformJs(record);
        break;
      case 'transformPeggy':
        await handleTransformPeggy(record, batch, peggyConfigOutputPaths);
        break;
      case 'transformText':
        await handleTransformText(record);
        break;
      case 'transformYaml':
        await handleTransformYaml(record);
        break;
      default:
        throw new Error(`Unknown record kind: ${record.kind}`);
    }
  }

  return { peggyConfigOutputPaths };
}
