/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const viewDetailsLabel = i18n.translate('searchResponseWarnings.viewDetailsButtonLabel', {
  defaultMessage: 'View details',
  description: "View warning details button label"
});

function getNonSuccessfulClusters(warnings: SearchResponseWarning[]) {
  const nonSuccessfulClusters = new Set<string>();
  warnings.forEach(warning => {
    Object.keys(warning.clusters).forEach(clusterName => {
      if (warning.clusters[clusterName].status !== 'successful') {
        nonSuccessfulClusters.add(clusterName);
      }
    });
  });
  return nonSuccessfulClusters;
}

export function getWarningsTitle(warnings: SearchResponseWarning[]) {
  const nonSuccessfulClusters = getNonSuccessfulClusters(warnings);
  const clustersClause = i18n.translate('searchResponseWarnings.title.clustersClause', {
    defaultMessage: 'Problem with {nonSuccessfulClustersCount} {nonSuccessfulClustersCount, plural, one {cluster} other {clusters}}',
    values: { nonSuccessfulClustersCount: nonSuccessfulClusters.size }
  });

  return warnings.length <= 1
    ? clustersClause
    : i18n.translate('searchResponseWarnings.title.clustersClauseAndRequestsClause', {
        defaultMessage: '{clustersClause} in {requestsCount} requests',
        values: {
          clustersClause,
          requestsCount: warnings.length,
        }
      })
}

export function getWarningsDescription(warnings: SearchResponseWarning[], visualizationLabel?: string) {
  const nonSuccessfulClusters = getNonSuccessfulClusters(warnings);
  return i18n.translate('searchResponseWarnings.description', {
    defaultMessage: '{nonSuccessfulClustersCount, plural, one {This cluster} other {These clusters}} had issues returning results. This might result in an incomplete {visualizationLabel}.',
    values: { 
      nonSuccessfulClustersCount: nonSuccessfulClusters.size,
      visualizationLabel: visualizationLabel
        ? visualizationLabel
        : i18n.translate('searchResponseWarnings.description.defaultVisualizationLabel', {
            defaultMessage: 'visualization',
          }),
    }
  });
}