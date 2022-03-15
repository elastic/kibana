/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { Annotation, Panel } from '../../../../common/types';
import { buildAnnotationRequest } from './build_request_body';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import type { SearchStrategy, SearchCapabilities, EsSearchRequest } from '../../search_strategies';

export type AnnotationServices = VisTypeTimeseriesRequestServices & {
  capabilities: SearchCapabilities;
  requestContext: VisTypeTimeseriesRequestHandlerContext;
  searchStrategy: SearchStrategy;
};

export async function getAnnotationRequestParams(
  req: VisTypeTimeseriesVisDataRequest,
  panel: Panel,
  annotation: Annotation,
  {
    esShardTimeout,
    esQueryConfig,
    capabilities,
    uiSettings,
    cachedIndexPatternFetcher,
    buildSeriesMetaParams,
  }: AnnotationServices
): Promise<EsSearchRequest> {
  const annotationIndex = await cachedIndexPatternFetcher(annotation.index_pattern);

  const request = await buildAnnotationRequest({
    req,
    panel,
    annotation,
    esQueryConfig,
    annotationIndex,
    capabilities,
    uiSettings,
    getMetaParams: () => buildSeriesMetaParams(annotationIndex, Boolean(panel.use_kibana_indexes)),
  });

  return {
    index: annotationIndex.indexPatternString,
    body: {
      ...request,
      runtime_mappings: annotationIndex.indexPattern?.getComputedFields().runtimeFields ?? {},
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
    trackingEsSearchMeta: {
      requestId: annotation.id,
      requestLabel: i18n.translate('visTypeTimeseries.annotationRequest.label', {
        defaultMessage: 'Annotation: {id}',
        values: {
          id: annotation.id,
        },
      }),
    },
  };
}
