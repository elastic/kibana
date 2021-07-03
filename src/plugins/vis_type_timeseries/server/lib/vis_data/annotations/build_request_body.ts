/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildProcessorFunction } from '../build_processor_function';
import { query, dateHistogram, topHits } from '../request_processors/annotations';
import type {
  AnnotationsRequestProcessorsFunction,
  AnnotationsRequestProcessorsParams,
} from '../request_processors/annotations/types';

export function buildAnnotationRequest(params: AnnotationsRequestProcessorsParams) {
  const processor = buildProcessorFunction<
    AnnotationsRequestProcessorsFunction,
    AnnotationsRequestProcessorsParams,
    Record<string, any>
  >([query, dateHistogram, topHits], params);

  return processor({});
}
