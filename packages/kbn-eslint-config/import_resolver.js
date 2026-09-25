/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `eslint-plugin-import` resolver (interface v2) backed by `@kbn/import-resolver`, so that the
 * `import/*` rules reuse the resolver already paid for by `@kbn/imports/*` instead of running a
 * second, uncached `eslint-import-resolver-node` pass over every import.
 *
 * Wired up via `settings['import/resolver']` in `.eslintrc.js`.
 */

const { getSharedImportResolver, resolveForEslintImport } = require('@kbn/eslint-plugin-imports');

exports.interfaceVersion = 2;

exports.resolve = (source, file) =>
  resolveForEslintImport(getSharedImportResolver(), source, file);
