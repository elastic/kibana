/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { ClusterDetails } from '@kbn/es-types';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import type { IInspectorInfo } from '../../../common/search/search_source';
import { SearchResponseWarning } from '../types';

/**
 * @internal
 */
export function extractWarnings(
  rawResponse: estypes.SearchResponse,
  inspectorService: InspectorStartContract,
  inspector?: IInspectorInfo
): SearchResponseWarning[] {
  const warnings: SearchResponseWarning[] = [];

  const isPartial = rawResponse._clusters
    ? Object.values(
        (
          rawResponse._clusters as estypes.ClusterStatistics & {
            details: Record<string, ClusterDetails>;
          }
        ).details
      ).some((clusterDetails) => clusterDetails.status !== 'successful')
    : rawResponse.timed_out || rawResponse._shards.failed > 0;
  if (isPartial) {
    warnings.push({
      type: 'incomplete',
      message: i18n.translate('data.search.searchSource.fetch.incompleteResultsMessage', {
        defaultMessage: 'The data might be incomplete or wrong.',
      }),
      clusters: rawResponse._clusters
        ? (
            rawResponse._clusters as estypes.ClusterStatistics & {
              details: Record<string, ClusterDetails>;
            }
          ).details
        : {
            '(local)': {
              status: 'partial',
              indices: '',
              took: rawResponse.took,
              timed_out: rawResponse.timed_out,
              _shards: rawResponse._shards,
              failures: rawResponse._shards.failures,
            },
          },
      openInInspector: () => {
        const adapter = inspector?.adapter ? inspector.adapter : new RequestAdapter();
        if (!inspector?.adapter) {
          const requestResponder = adapter.start(
            i18n.translate('data.search.searchSource.anonymousRequestTitle', {
              defaultMessage: 'Request',
            })
          );
          requestResponder.ok({ json: rawResponse });
        }

        inspectorService.open(
          {
            requests: adapter,
          },
          {
            options: {
              initialRequestId: inspector?.id,
              initialTabs: ['clusters', 'response'],
            },
          }
        );
      },
    });
  }

  return warnings;
}
