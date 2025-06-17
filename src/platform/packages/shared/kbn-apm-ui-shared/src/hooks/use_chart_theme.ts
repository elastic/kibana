/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PartialTheme, Theme } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { useMemo } from 'react';

/* This duplicates useChartThemes from @kbn/observability-shared-plugin/public.
We're considering extracting parts of that plugin into a platform-level package,
so this duplication might be temporary depending on how that evolves. */

export function useChartThemes(): { baseTheme: Theme; theme: PartialTheme[] } {
  const baseTheme = useElasticChartsTheme();

  return useMemo(() => {
    const themeOverrides: PartialTheme = {
      chartMargins: {
        left: 10,
        right: 10,
        top: 35,
        bottom: 10,
      },
      background: {
        color: 'transparent',
      },
      lineSeriesStyle: {
        point: { visible: 'never' },
      },
      areaSeriesStyle: {
        point: { visible: 'never' },
      },
    };

    return {
      theme: [themeOverrides],
      baseTheme,
    };
  }, [baseTheme]);
}
