/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dimension } from '@kbn/metrics-experience-plugin/common/types';

export const getTopLevelNamespace = (metricName: string) => {
  // Extract top-level namespace from metric name (e.g., "system" from "system.network.in.bytes")
  const idx = metricName.indexOf('.');
  return idx === -1 ? metricName : metricName.slice(0, idx + 1);
};

export const categorizeDimensions = (dimensions: Dimension[], metricName: string) => {
  const topLevelNamespace = getTopLevelNamespace(metricName);

  return dimensions.reduce(
    (acc, dim) => {
      const isRequired =
        dim.name.startsWith('attributes.') || dim.name.startsWith(topLevelNamespace);

      (isRequired ? acc.requiredDimensions : acc.optionalDimensions).push(dim);
      return acc;
    },
    { requiredDimensions: [] as Dimension[], optionalDimensions: [] as Dimension[] }
  );
};

const getSortPriority = (name: string, topLevelNamespace: string): number => {
  if (name.startsWith('attributes.')) {
    return 0;
  }
  if (name.startsWith(`${topLevelNamespace}.`)) {
    return 1;
  }
  return 2;
};

export const sortDimensions = (dimensions: Dimension[], topLevelNamespace: string) => {
  return [...dimensions].sort((a, b) => {
    const priorityDiff =
      getSortPriority(a.name, topLevelNamespace) - getSortPriority(b.name, topLevelNamespace);
    return priorityDiff !== 0 ? priorityDiff : a.name.localeCompare(b.name);
  });
};
