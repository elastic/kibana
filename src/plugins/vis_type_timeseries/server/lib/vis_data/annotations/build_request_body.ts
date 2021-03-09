/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/server';
import { EsQueryConfig, IndexPattern } from 'src/plugins/data/server';
import { AnnotationItemsSchema, PanelSchema } from '../../../../common/types';
import { VisTypeTimeseriesVisDataRequest } from '../../../types';
import { DefaultSearchCapabilities } from '../../search_strategies';
import { buildProcessorFunction } from '../build_processor_function';
// @ts-expect-error
import { processors } from '../request_processors/annotations';

/**
 * Builds annotation request body
 *
 * @param {...args}: [
 *   req: {Object} - a request object,
 *   panel: {Object} - a panel object,
 *   annotation: {Object} - an annotation object,
 *   esQueryConfig: {Object} - es query config object,
 *   indexPatternObject: {Object} - an index pattern object,
 *   capabilities: {Object} - a search capabilities object
 * ]
 * @returns {Object} doc - processed body
 */
export async function buildAnnotationRequest(
  ...args: [
    VisTypeTimeseriesVisDataRequest,
    PanelSchema,
    AnnotationItemsSchema,
    EsQueryConfig,
    IndexPattern | null | undefined,
    DefaultSearchCapabilities,
    IUiSettingsClient
  ]
) {
  const processor = buildProcessorFunction(processors, ...args);
  const doc = await processor({});
  return doc;
}
