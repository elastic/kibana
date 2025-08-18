/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const categorizeDimensions = (
  dimensions: Array<{ name: string; type: string }>,
  metricName: string
) => {
  const topLevelNamespace = metricName.split('.')[0] + '.';
  const requiredDimensions = dimensions.filter((dim) => {
    const isAttributes = dim.name.startsWith('attributes.');
    const isTopLevel = dim.name.startsWith(topLevelNamespace);
    return isAttributes || isTopLevel;
  });
  const optionalDimensions = dimensions.filter((dim) => {
    const isAttributes = dim.name.startsWith('attributes.');
    const isTopLevel = dim.name.startsWith(topLevelNamespace);
    return !(isAttributes || isTopLevel);
  });

  return { requiredDimensions, optionalDimensions };
};
