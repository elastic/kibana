/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/server';
import { EsQueryConfig } from 'src/plugins/data/server';
import type { Annotation, FetchedIndexPattern, Panel } from '../../../../common/types';
import { VisTypeTimeseriesVisDataRequest } from '../../../types';
import { DefaultSearchCapabilities } from '../../search_strategies';
import { buildProcessorFunction } from '../build_processor_function';
// @ts-expect-error
import { processors } from '../request_processors/annotations';

/**
 * Builds annotation request body
 */
export async function buildAnnotationRequest(
  ...args: [
    VisTypeTimeseriesVisDataRequest,
    Panel,
    Annotation,
    EsQueryConfig,
    FetchedIndexPattern,
    DefaultSearchCapabilities,
    IUiSettingsClient
  ]
) {
  const processor = buildProcessorFunction(processors, ...args);
  const doc = await processor({});
  return doc;
}
