/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NoCssColor } from './src/rules/no_css_color';
import { PreferCSSAttributeForEuiComponents } from './src/rules/prefer_css_attribute_for_eui_components';

/**
 * Custom ESLint rules, included as `'@kbn/eslint-plugin-design-tokens'` in the kibana eslint config
 * @internal
 */
export const rules = {
  no_css_color: NoCssColor,
  prefer_css_attributes_for_eui_components: PreferCSSAttributeForEuiComponents,
};
