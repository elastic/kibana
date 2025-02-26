/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { SearchResponseWarning } from '../../types';

export const viewDetailsLabel = i18n.translate('searchResponseWarnings.viewDetailsButtonLabel', {
  defaultMessage: 'View details',
  description: 'View warning details button label',
});

export function getNonSuccessfulClusters(warnings: SearchResponseWarning[]) {
  const nonSuccessfulClusters = new Set<string>();
  warnings.forEach((warning) => {
    Object.keys(warning.clusters).forEach((clusterName) => {
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
    defaultMessage:
      'Problem with {nonSuccessfulClustersCount} {nonSuccessfulClustersCount, plural, one {cluster} other {clusters}}',
    values: { nonSuccessfulClustersCount: nonSuccessfulClusters.size },
  });

  return warnings.length <= 1
    ? clustersClause
    : i18n.translate('searchResponseWarnings.title.clustersClauseAndRequestsClause', {
        defaultMessage: '{clustersClause} in {requestsCount} requests',
        values: {
          clustersClause,
          requestsCount: warnings.length,
        },
      });
}

export function getWarningsDescription(warnings: SearchResponseWarning[]) {
  const nonSuccessfulClusters = getNonSuccessfulClusters(warnings);
  return nonSuccessfulClusters.size <= 1
    ? i18n.translate('searchResponseWarnings.description.singleCluster', {
        defaultMessage: 'This cluster had issues returning data and results might be incomplete.',
      })
    : i18n.translate('searchResponseWarnings.description.multipleClusters', {
        defaultMessage: 'These clusters had issues returning data and results might be incomplete.',
      });
}

export function getWarningsParsedReasons(warnings: SearchResponseWarning[]) {
  const reasons = new Set<string>();
  // example of a reason: "Can't sort on field [log.level]; the field has incompatible sort types: [LONG] and [STRING] across shards!"
  const cantSortRegExp = /Can't sort on field \[(.+)\];/;

  warnings.forEach((warning) => {
    Object.keys(warning.clusters).forEach((clusterName) => {
      if (warning.clusters[clusterName].status === 'successful') {
        return;
      }

      const failures = warning.clusters[clusterName].failures;

      failures?.forEach((failure) => {
        const causedBy = failure?.reason?.caused_by;
        const matchReason = cantSortRegExp.exec(causedBy?.reason ?? '');

        if (causedBy?.type === 'illegal_argument_exception' && matchReason) {
          reasons.add(
            i18n.translate('searchResponseWarnings.description.cantSortReasonText', {
              defaultMessage:
                'The results cannot be sorted on field "{field}" because it has incompatible types across shards. Consider removing the sort, adding "exist" filter for the field value, or updating the field mapping.',
              values: {
                field: matchReason[1],
              },
            })
          );
        }
      });
    });
  });

  return reasons;
}
