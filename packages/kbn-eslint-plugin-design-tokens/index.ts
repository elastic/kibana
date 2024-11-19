/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { noCssColor } from './rules/no_css_color';
import { preferCSSAttributeForEuiComponents } from './rules/prefer_css_attributes_for_eui_components';

/**
 * Custom ESLint rules, add `'@kbn/eslint_plugin_design_tokens'` to your eslint config to use them
 * @internal
 */

const rules = {
  no_css_color: noCssColor,
  prefer_css_attributes_for_eui_components: preferCSSAttributeForEuiComponents,
};
