/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import type { OperatorCategory } from './operator_icon';

/** One color per kind of work, shared by every part of the profile that colors operators. */
export const useOperatorCategoryColors = (): Record<OperatorCategory, string> => {
  const { euiTheme } = useEuiTheme();

  return {
    source: euiTheme.colors.vis.euiColorVis0,
    filter: euiTheme.colors.vis.euiColorVis2,
    compute: euiTheme.colors.vis.euiColorVis4,
    aggregate: euiTheme.colors.vis.euiColorVis6,
    exchange: euiTheme.colors.vis.euiColorVis8,
    other: euiTheme.colors.mediumShade,
  };
};
