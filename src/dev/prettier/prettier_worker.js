/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Forked by run_prettier_full.ts from the repo root with `{ fix }` as JSON in argv: checks (or,
// with `fix`, formats) each chunk of repo-relative files it receives and replies with
// `{ unformatted, errors }`.
const Fs = require('fs');
const Path = require('path');
const prettier = require('prettier');

const { fix } = JSON.parse(process.argv[2]);

process.on('message', (files) => {
  const unformatted = [];
  const errors = [];
  for (const file of files) {
    const path = Path.resolve(file);
    try {
      const source = Fs.readFileSync(path, 'utf8');
      const formatted = prettier.format(source, {
        ...prettier.resolveConfig.sync(path, { editorconfig: true }),
        // Keep each file's existing line endings, as the `prettier/prettier` ESLint rule did.
        endOfLine: 'auto',
        filepath: path,
      });
      if (formatted !== source) {
        unformatted.push(file);
        if (fix) {
          Fs.writeFileSync(path, formatted);
        }
      }
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
  process.send({ unformatted, errors });
});
