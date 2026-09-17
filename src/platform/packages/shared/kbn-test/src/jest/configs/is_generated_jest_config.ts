/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, resolve } from 'path';

/**
 * A newly-scaffolded package always gets a jest config from the `kbn-generate`
 * package template (`packages/kbn-generate/templates/package/jest.config.js.ejs`):
 *
 *   module.exports = {
 *     preset: '@kbn/test' | '@kbn/test/jest_node',
 *     rootDir: <relative path to repo root>,
 *     roots: ['<rootDir>/<package dir>'],
 *   };
 *
 * Many such packages (mocks, types, Scout-only, etc.) never add Jest tests, so
 * this untouched boilerplate legitimately matches no tests. We tolerate those:
 * CI already filters them out and they carry no author intent.
 *
 * A config is "generated boilerplate" only if it still looks EXACTLY like that
 * template — the moment someone adds `testMatch`, `moduleNameMapper`,
 * `collectCoverageFrom`, extra/relocated `roots`, etc., they signalled intent to
 * run Jest tests here, so an empty one is dead code that should be removed
 * rather than silently tolerated.
 *
 * If the generator template changes, update the shape recognized here.
 */
const GENERATED_PRESETS = new Set(['@kbn/test', '@kbn/test/jest_node']);
const GENERATED_KEYS = new Set(['preset', 'rootDir', 'roots']);

export function isGeneratedJestConfig(configAbsPath: string): boolean {
  let config: Record<string, unknown>;
  try {
    config = require(configAbsPath);
  } catch {
    return false;
  }

  const keys = Object.keys(config);
  if (keys.length !== GENERATED_KEYS.size || !keys.every((k) => GENERATED_KEYS.has(k))) {
    return false;
  }

  if (typeof config.preset !== 'string' || !GENERATED_PRESETS.has(config.preset)) {
    return false;
  }

  if (typeof config.rootDir !== 'string') {
    return false;
  }

  // `roots` must be a single entry pointing at the config's own directory
  // (expressed as `<rootDir>/<own dir>`), exactly as the template emits it.
  if (!Array.isArray(config.roots) || config.roots.length !== 1) {
    return false;
  }

  const [root] = config.roots;
  if (typeof root !== 'string' || !root.startsWith('<rootDir>/')) {
    return false;
  }

  const configDir = dirname(configAbsPath);
  const rootDirAbs = resolve(configDir, config.rootDir);
  const rootAbs = resolve(rootDirAbs, root.replace('<rootDir>/', ''));

  return rootAbs === configDir;
}
