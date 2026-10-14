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

const turnOffWarnings = (rules: Rules): Rules =>
  Object.fromEntries(
    Object.entries(rules).map(([name, value]) => {
      const severity = Array.isArray(value) ? value[0] : value;
      return [name, severity === 'warn' || severity === 1 ? 'off' : value];
    })
  );

/**
 * Returns `config` with every `warn` rule turned off, in `rules` and in each override, so the
 * last matching override still decides each file's severity.
 *
 * Oxlint's `--fix` applies fixes for warnings too, and `--quiet` only hides them. ESLint's
 * `--quiet --fix` fixed errors only, so `--fix` runs against this config to keep warnings
 * unfixed.
 */
export const errorsOnly = (config: OxlintConfig): OxlintConfig => ({
  ...config,
  rules: config.rules && turnOffWarnings(config.rules),
  overrides: config.overrides?.map((override) => ({
    ...override,
    rules: override.rules && turnOffWarnings(override.rules),
  })),
});
