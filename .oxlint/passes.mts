/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintConfig } from 'oxlint';

type Rules = NonNullable<OxlintConfig['rules']>;

/**
 * The whole-repo run in `@kbn/lint-cli` lints in two passes, chosen with the `OXLINT_PASS`
 * environment variable. Oxlint's native import plugin keeps every module's import and export
 * records in memory, most of a shard's memory, while the JS plugins keep each shard's single JS
 * thread busy. Splitting them lets the JS plugin pass run more shards without running out of
 * memory. Without `OXLINT_PASS` (editors, scoped runs) the config runs every rule at once.
 */
export type OxlintPass = 'without-import-plugin' | 'import-plugin';

const isImportPluginRule = (name: string) => name.startsWith('import/');

const filterRules = (config: OxlintConfig, keep: (name: string) => boolean): OxlintConfig => {
  const filter = (rules: Rules | undefined) =>
    rules && Object.fromEntries(Object.entries(rules).filter(([name]) => keep(name)));
  return {
    ...config,
    rules: filter(config.rules),
    overrides: config.overrides?.map((override) => ({ ...override, rules: filter(override.rules) })),
  };
};

/** Returns the part of `config` that `pass` runs, or all of it when `pass` is unset. */
export const forPass = (config: OxlintConfig, pass: string | undefined): OxlintConfig => {
  switch (pass) {
    case undefined:
    case '':
      return config;
    case 'without-import-plugin':
      return {
        ...filterRules(config, (name) => !isImportPluginRule(name)),
        plugins: config.plugins?.filter((plugin) => plugin !== 'import'),
      };
    case 'import-plugin':
      return {
        ...filterRules(config, isImportPluginRule),
        plugins: ['import'],
        jsPlugins: [],
      };
    default:
      throw new Error(`Unknown OXLINT_PASS "${pass}"`);
  }
};
