/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { eslintCompatPlugin } from '@oxlint/plugins';
import { RequireEuiFormCompressed } from './rules/require_eui_form_compressed';

/**
 * Custom rules for the @kbn/alerting-v2-rule-form package, run by Oxlint through
 * `oxlint_plugin.js`; `eslintCompatPlugin` keeps them loadable by ESLint as
 * `'@kbn/eslint-plugin-alerting-v2'`.
 * @internal
 */
export const { meta, rules } = eslintCompatPlugin({
  meta: { name: '@kbn/alerting-v2' },
  rules: {
    require_eui_form_compressed: RequireEuiFormCompressed,
  },
});
