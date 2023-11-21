/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';

const MIN_WIDTH = 300;

export const changeDataViewStyles = ({
  fullWidth,
  maxLabelLength,
}: {
  fullWidth?: boolean;
  maxLabelLength: number;
}) => {
  return {
    trigger: {
      maxWidth: fullWidth ? undefined : MIN_WIDTH,
    },
    popoverContent: {
      width: calculateWidthFromCharCount(maxLabelLength, { minWidth: MIN_WIDTH }),
    },
  };
};
