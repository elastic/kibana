/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { eslintCompatPlugin } from '@oxlint/plugins';
import { PreferToastActionProps } from './rules/prefer_toast_action_props';
import { PreferKbnUiCallout } from './rules/prefer_kbn_ui_callout';
import { NoRestrictedPackageImports } from './rules/no_restricted_package_imports';
import { PortableImports } from './rules/portable_imports';

/**
 * Custom rules for kbn-ui packages, run by Oxlint through `oxlint_plugin.js`; `eslintCompatPlugin`
 * keeps them loadable by ESLint as `'@kbn/eslint-plugin-kbn-ui'`.
 * @internal
 */
export const { meta, rules } = eslintCompatPlugin({
  meta: { name: '@kbn/kbn-ui' },
  rules: {
    prefer_toast_action_props: PreferToastActionProps,
    prefer_kbn_ui_callout: PreferKbnUiCallout,
    no_restricted_package_imports: NoRestrictedPackageImports,
    portable_imports: PortableImports,
  },
});
