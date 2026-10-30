/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const LIST_PATH = resolve(import.meta.dirname, '../src/helpers/core_private_importers.ts');
// oxlint resolves `jsPlugins` and `ignorePatterns` relative to the config file, so it must live in the repo root
const CONFIG_PATH = resolve(REPO_ROOT, 'oxlint.core_private_importers.tmp.mjs');
const LIST_PATTERN = /new Set\(\[[^\]]*\]\)/;
const MESSAGE_MARKER = 'is private to Core';

const renderList = (files) =>
  files.length === 0
    ? 'new Set([])'
    : `new Set([\n${files.map((file) => `  '${file}',\n`).join('')}])`;

const writeList = (source, files) =>
  writeFileSync(LIST_PATH, source.replace(LIST_PATTERN, renderList(files)));

const lintWithOnlyTheRule = () => {
  writeFileSync(
    CONFIG_PATH,
    `import config from './oxlint.config.mjs';
export default {
  ...config,
  jsPlugins: config.jsPlugins.filter((plugin) => plugin.name === '@kbn/imports'),
  rules: {},
  overrides: [
    { files: ['**/*.{js,mjs,ts,tsx}'], rules: { '@kbn/imports/no_group_crossing_imports': 'error' } },
  ],
};
`
  );
  const oxlintBin = resolve(
    dirname(createRequire(import.meta.url).resolve('oxlint/package.json')),
    'bin/oxlint'
  );
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [oxlintBin, '--config', CONFIG_PATH, '--format', 'json'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  );
  if (status !== 0 && status !== 1) {
    throw new Error(`oxlint exited with ${status}:\n${stderr || stdout}`);
  }
  return JSON.parse(stdout.slice(stdout.indexOf('{')));
};

const original = readFileSync(LIST_PATH, 'utf8');
if (!LIST_PATTERN.test(original)) {
  throw new Error(`could not find the list in ${LIST_PATH}`);
}

try {
  writeList(original, []);
  const { diagnostics, number_of_files: lintedFiles } = lintWithOnlyTheRule();
  const files = [
    ...new Set(
      diagnostics
        .filter(({ filename, message }) => filename && message.includes(MESSAGE_MARKER))
        .map(({ filename }) => relative(REPO_ROOT, resolve(REPO_ROOT, filename)))
    ),
  ].sort();
  writeList(original, files);
  process.stdout.write(
    `linted ${lintedFiles} files, wrote ${files.length} files to ${relative(
      REPO_ROOT,
      LIST_PATH
    )}\n`
  );
} catch (error) {
  writeFileSync(LIST_PATH, original);
  throw error;
} finally {
  rmSync(CONFIG_PATH, { force: true });
}
