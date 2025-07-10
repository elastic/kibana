/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { type UseEuiTheme } from '@elastic/eui';

export const getVisVariables = ({ euiTheme }: { euiTheme: UseEuiTheme['euiTheme'] }) => {
  const fullShade = chroma(euiTheme.colors.fullShade);
  const emptyShade = chroma(euiTheme.colors.emptyShade);

  return {
    tvbTextColor: fullShade.alpha(0.6).css(),
    tvbTextColorReversed: emptyShade.alpha(0.6).css(),

    tvbValueColor: fullShade.alpha(0.7).css(),
    tvbValueColorReversed: emptyShade.alpha(0.8).css(),

    tvbHoverBackgroundColor: fullShade.alpha(0.1).css(),
    tvbHoverBackgroundColorReversed: emptyShade.alpha(0.1).css(),
  };
};
