/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { useMemo } from 'react';

export const useCommonChartStyles = () => {
  const { euiTheme } = useEuiTheme();

  const subdued = useMemo(
    () => css`
      fill: ${euiTheme.colors.subduedText};
    `,
    [euiTheme.colors.subduedText]
  );

  const accent = css`
    fill: ${euiThemeVars.euiColorVis0};
  `;

  return {
    chartIcon: { subdued, accent },
  };
};
