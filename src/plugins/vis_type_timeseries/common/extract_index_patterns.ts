/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { uniq } from 'lodash';
import { PanelSchema } from '../common/types';

export function extractIndexPatterns(
  panel: PanelSchema,
  defaultIndex?: PanelSchema['default_index_pattern']
) {
  const patterns: string[] = [];

  if (panel.index_pattern) {
    patterns.push(panel.index_pattern);
  }

  panel.series.forEach((series) => {
    const indexPattern = series.series_index_pattern;
    if (indexPattern && series.override_index_pattern) {
      patterns.push(indexPattern);
    }
  });

  if (panel.annotations) {
    panel.annotations.forEach((item) => {
      const indexPattern = item.index_pattern;
      if (indexPattern) {
        patterns.push(indexPattern);
      }
    });
  }

  if (patterns.length === 0 && defaultIndex) {
    patterns.push(defaultIndex);
  }

  return uniq<string>(patterns).sort();
}
