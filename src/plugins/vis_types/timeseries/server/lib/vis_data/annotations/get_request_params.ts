/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Annotation, Panel } from '../../../../common/types';
import { buildAnnotationRequest } from './build_request_body';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import type { SearchStrategy, SearchCapabilities } from '../../search_strategies';

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
  }: AnnotationServices
) {
  const annotationIndex = await cachedIndexPatternFetcher(annotation.index_pattern);

  const request = await buildAnnotationRequest({
    req,
    panel,
    annotation,
    esQueryConfig,
    annotationIndex,
    capabilities,
    uiSettings,
  });

  return {
    index: annotationIndex.indexPatternString,
    body: {
      ...request,
      runtime_mappings: annotationIndex.indexPattern?.getComputedFields().runtimeFields ?? {},
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
  };
}
