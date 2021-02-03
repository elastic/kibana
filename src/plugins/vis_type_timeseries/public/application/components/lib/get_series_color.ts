/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { labelDateFormatter } from './label_date_formatter';
import type { OverwriteColors } from '../color_picker';

export const getSeriesColor = (
  overwriteColors: OverwriteColors[],
  label: string,
  labelFormatted: string
) => {
  let seriesName = label.toString();
  if (labelFormatted) {
    seriesName = labelDateFormatter(labelFormatted);
  }
  if (overwriteColors.length && Object.keys(overwriteColors[0]?.overwrite).includes(seriesName)) {
    return overwriteColors[0]?.overwrite[seriesName];
  }

  return null;
};
