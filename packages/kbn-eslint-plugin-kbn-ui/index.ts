/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { builtinRules } from 'eslint/use-at-your-own-risk';
import { PreferToastActionProps } from './rules/prefer_toast_action_props';
import { PreferKbnUiCallout } from './rules/prefer_kbn_ui_callout';
import { NoRestrictedPackageImports } from './rules/no_restricted_package_imports';

// Core `no-restricted-imports` under a separate name, so the kbn-ui allowlist adds to
// the repo-wide `no-restricted-imports` config instead of replacing it.
const PortableImports = builtinRules.get('no-restricted-imports');
if (!PortableImports) {
  throw new Error('ESLint core rule "no-restricted-imports" is not available');
}

/**
 * Custom ESLint rules for kbn-ui packages.
 * Add `'@kbn/eslint-plugin-kbn-ui'` to your eslint config to use them.
 * @internal
 */
export const rules = {
  prefer_toast_action_props: PreferToastActionProps,
  prefer_kbn_ui_callout: PreferKbnUiCallout,
  no_restricted_package_imports: NoRestrictedPackageImports,
  portable_imports: PortableImports,
};
