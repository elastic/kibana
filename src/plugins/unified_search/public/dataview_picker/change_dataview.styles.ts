/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { DataViewListItemEnhanced } from './dataview_list';

const MIN_WIDTH = 300;

export const changeDataViewStyles = ({
  fullWidth,
  dataViewsList,
}: {
  fullWidth?: boolean;
  dataViewsList: DataViewListItemEnhanced[];
}) => {
  return {
    trigger: {
      maxWidth: fullWidth ? undefined : MIN_WIDTH,
    },
    popoverContent: {
      width: calculateWidthFromEntries(dataViewsList, ['name', 'id'], { minWidth: MIN_WIDTH }),
    },
  };
};
