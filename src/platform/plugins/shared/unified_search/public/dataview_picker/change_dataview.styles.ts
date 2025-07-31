/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { DataViewListItemEnhanced } from './dataview_list';

const DEFAULT_WIDTH = 350;

export const changeDataViewStyles = ({
  fullWidth,
  dataViewsList,
  theme,
  isMobile,
}: {
  fullWidth?: boolean;
  dataViewsList: DataViewListItemEnhanced[];
  theme: EuiThemeComputed;
  isMobile: boolean;
}) => {
  return {
    trigger: {
      maxWidth: fullWidth ? undefined : DEFAULT_WIDTH,
      backgroundColor: theme.colors.backgroundBasePlain,
      border: `${theme.border.width.thin} solid ${theme.colors.borderBasePlain}`,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    popoverContent: {
      width: calculateWidthFromEntries(dataViewsList, ['name', 'id'], {
        minWidth: DEFAULT_WIDTH,
        ...(isMobile && { maxWidth: DEFAULT_WIDTH }),
      }),
    },
  };
};
