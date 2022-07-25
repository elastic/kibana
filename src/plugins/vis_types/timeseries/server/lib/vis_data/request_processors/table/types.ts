/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { EsQueryConfig } from '@kbn/es-query';
import type { FetchedIndexPattern, Panel } from '../../../../../common/types';
import type { SearchCapabilities } from '../../../search_strategies';
import type { VisTypeTimeseriesVisDataRequest } from '../../../../types';

import type { ProcessorFunction } from '../../build_processor_function';
import type { BaseMeta } from '../types';

export interface TableRequestProcessorsParams {
  req: VisTypeTimeseriesVisDataRequest;
  panel: Panel;
  esQueryConfig: EsQueryConfig;
  seriesIndex: FetchedIndexPattern;
  capabilities: SearchCapabilities;
  uiSettings: IUiSettingsClient;
  buildSeriesMetaParams: () => Promise<{
    maxBars: number;
    timeField?: string;
    interval: string;
  }>;
}

export interface TableSearchRequestMeta extends BaseMeta {
  panelId?: string;
  timeField?: string;
  normalized?: boolean;
}

export type TableSearchRequest = Record<string, any>;

export type TableRequestProcessorsFunction = ProcessorFunction<
  TableRequestProcessorsParams,
  TableSearchRequest
>;
