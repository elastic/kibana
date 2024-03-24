/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Declaration } from 'postcss';
import { getDisplayP3Color } from '../../common/get_display_p3_color';

const getDisplayP3ColorWithFallback = (decl: Declaration) => {
  const value = decl.value;
  if (value.startsWith('#') || value.startsWith('rgb')) {
    decl.cloneAfter({ prop: decl.prop, value: getDisplayP3Color(value) });
  }
};

export const toDisplayP3ColorPostcss = () => {
  return {
    postcssPlugin: 'to-display-p3-color',
    Declaration: {
      color: getDisplayP3ColorWithFallback,
      'background-color': getDisplayP3ColorWithFallback,
      'border-color': getDisplayP3ColorWithFallback,
      'outline-color': getDisplayP3ColorWithFallback,
    },
  };
};
