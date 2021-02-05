/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';

export function extractIndexPatterns(panel, excludedFields = {}) {
  const patterns = [];

  if (!excludedFields[panel.index_pattern]) {
    patterns.push(panel.index_pattern);
  }

  panel.series.forEach((series) => {
    const indexPattern = series.series_index_pattern;
    if (indexPattern && series.override_index_pattern && !excludedFields[indexPattern]) {
      patterns.push(indexPattern);
    }
  });

  if (panel.annotations) {
    panel.annotations.forEach((item) => {
      const indexPattern = item.index_pattern;
      if (indexPattern && !excludedFields[indexPattern]) {
        patterns.push(indexPattern);
      }
    });
  }

  if (patterns.length === 0) {
    patterns.push('');
  }

  return uniq(patterns).sort();
}
