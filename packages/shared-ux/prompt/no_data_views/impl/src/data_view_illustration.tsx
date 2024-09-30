/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css as emotion } from '@emotion/css';

import svg from './data_view_illustration.svg';

export const DataViewIllustration = () => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;

  const css = emotion`
    .dataViewIllustrationVerticalStripes {
      fill: ${colors.fullShade};
    };
    .dataViewIllustrationDots {
      fill: ${colors.lightShade};
    }
  `;

  return <img src={svg} css={css} alt="Data view illustration" />;
};
