/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';

export const useCommonChartStyles = () => {
  const { euiTheme } = useEuiTheme();

  const subdued = useMemo(
    () => css`
      fill: ${euiTheme.colors.subdued};
    `,
    [euiTheme.colors.subdued]
  );

  const accent = useMemo(
    () => css`
      fill: ${euiTheme.colors.ink};
    `,
    [euiTheme.colors.ink]
  );

  return {
    chartIcon: { subdued, accent },
  };
};
