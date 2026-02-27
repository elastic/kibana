/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';

export const useGetHttpStatusColor = (status: string | number) => {
  const { euiTheme } = useEuiTheme();
  const httpStatusCodeColors: Record<string, string> = {
    1: euiTheme.colors.vis.euiColorVisGrey0,
    2: euiTheme.colors.vis.euiColorVisSuccess0,
    3: euiTheme.colors.vis.euiColorVisGrey0,
    4: euiTheme.colors.vis.euiColorVisWarning1,
    5: euiTheme.colors.vis.euiColorVisDanger0,
    7: euiTheme.colors.vis.euiColorVisGrey0,
  };

  const firstStatusDigit = String(status).charAt(0);
  return httpStatusCodeColors[firstStatusDigit] || 'default';
};
