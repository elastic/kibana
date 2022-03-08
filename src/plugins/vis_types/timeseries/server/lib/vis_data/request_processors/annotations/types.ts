/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IUiSettingsClient } from 'kibana/server';
import type { EsQueryConfig } from '@kbn/es-query';
import type { VisTypeTimeseriesVisDataRequest } from '../../../../types';
import type { Annotation, FetchedIndexPattern, Panel } from '../../../../../common/types';
import type { SearchCapabilities } from '../../../search_strategies';

import type { ProcessorFunction } from '../../build_processor_function';

export interface AnnotationsRequestProcessorsParams {
  req: VisTypeTimeseriesVisDataRequest;
  panel: Panel;
  annotation: Annotation;
  esQueryConfig: EsQueryConfig;
  annotationIndex: FetchedIndexPattern;
  capabilities: SearchCapabilities;
  uiSettings: IUiSettingsClient;
  getMetaParams: () => Promise<{
    maxBars: number;
    timeField?: string | undefined;
    interval: string;
  }>;
}

export type AnnotationSearchRequest = Record<string, unknown>;

export type AnnotationsRequestProcessorsFunction = ProcessorFunction<
  AnnotationsRequestProcessorsParams,
  AnnotationSearchRequest
>;
