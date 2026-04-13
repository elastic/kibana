/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateCssVarsStylesheet } from '@kbn/ui-theme';

const EUI_CSS_VARS_ENABLED =
  (typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    process.env.EUI_CSS_VARS === 'true') ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('EUI_CSS_VARS') === 'true');

let injected = false;

export const injectCssVarStylesheet = (): void => {
  if (!EUI_CSS_VARS_ENABLED || injected) {
    return;
  }
  injected = true;

  const style = document.createElement('style');
  style.setAttribute('data-eui-css-vars', 'true');
  style.textContent = generateCssVarsStylesheet();
  document.head.appendChild(style);
};
