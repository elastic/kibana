/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const unquote = (source: string) => source.trim().replace(/^"|"$/g, '');

/**
 * Source recommended queries should read. A data view such as `logs-*` matches
 * nothing when the only data is a federated dataset, so the dataset is used then.
 */
export const getRecommendationSource = ({
  currentTitle,
  hasLocalESData,
  datasetNames,
}: {
  currentTitle?: string;
  hasLocalESData: boolean;
  datasetNames: readonly string[];
}): string | undefined => {
  const title = currentTitle?.trim() || undefined;
  if (hasLocalESData || datasetNames.length === 0) {
    return title;
  }

  const currentSources = new Set((title ?? '').split(',').map(unquote).filter(Boolean));
  if ([...currentSources].some((source) => datasetNames.includes(source))) {
    return title;
  }

  return datasetNames[0];
};
