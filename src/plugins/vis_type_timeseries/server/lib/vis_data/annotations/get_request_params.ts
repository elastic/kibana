/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnnotationItemsSchema, PanelSchema } from 'src/plugins/vis_type_timeseries/common/types';
import { buildAnnotationRequest } from './build_request_body';
import { getIndexPatternObject } from '../../search_strategies/lib/get_index_pattern';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { AbstractSearchStrategy } from '../../search_strategies';

export type AnnotationServices = VisTypeTimeseriesRequestServices & {
  capabilities: any;
  requestContext: VisTypeTimeseriesRequestHandlerContext;
  searchStrategy: AbstractSearchStrategy;
};

export async function getAnnotationRequestParams(
  req: VisTypeTimeseriesVisDataRequest,
  panel: PanelSchema,
  annotation: AnnotationItemsSchema,
  {
    esShardTimeout,
    esQueryConfig,
    capabilities,
    indexPatternsService,
    uiSettings,
  }: AnnotationServices
) {
  const {
    indexPatternObject,
    indexPatternString,
  } = await getIndexPatternObject(annotation.index_pattern!, { indexPatternsService });

  const request = await buildAnnotationRequest(
    req,
    panel,
    annotation,
    esQueryConfig,
    indexPatternObject,
    capabilities,
    uiSettings
  );

  return {
    index: indexPatternString,
    body: {
      ...request,
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
  };
}
